'use strict';

const R = require('ramda');
const Task = require('data.task');
const logger = require('./logger');
const ctx = require('./context');

const invokeWithCallback = (fn, context) => {
  const cb = () => { };
  const t = new Task(cb);
  fn(context, cb);
  return t;
};

const convertPromiseToTask = p => {
  const cb = p.then.bind(p);
  return new Task(cb);
};

/**
 * Takes a stage function and invokes it with an exception handler.
 * If stage function (written by user) fails with an unhandled exception
 * this wrapper takes care of transforming it to a {Task} so that rest
 * of the pipeline can take appropriate actions.
 * @param {Function} fn - Stage function to invoke.
 * @param {Context} context - Context for stage function.
 * @returns {Task} - Either the Task returned by the stage or a wrapper Task
 * for all other return types.
 */
const callUserStageSafe = (fn, context) => {
  try {
    if (fn.length > 1) {
      return invokeWithCallback(fn, context);
    }

    let r = fn(context);
    if (r instanceof Promise) {
      return convertPromiseToTask(r);
    }

    if (!(r instanceof Task)) {
      return Task.of(r);
    }

    return r;
  } catch (e) {
    return Task.rejected(e);
  }
};

/**
 * Wraps a stage function so that we make sure the return value is
 * always a {Task} of {Context}.
 * This function also ensures the return value of stage is appended
 * to the Context correctly.
 * @param {Function} fn - stage function.
 * @param {Object} config - stage function configuration.
 * @returns {Function} - Wrapped stage function.
 */
const invokeStage = (fn, config) => {
  return context => {
    return callUserStageSafe(fn, context)
      .chain(props => {
        // If stage is not returning a result or echoing the context we don't
        // need to worry about merging the result in.
        if (!props || props === context) {
          return Task.of(context);
        }

        // Append the props to context.
        let appended;
        if (R.is(Object, props)) {
          appended = ctx.appendToContext(context, props);
        } else {
          const w = {};
          w[config.name] = props;
          appended = ctx.appendToContext(context, w);
        }

        return R.is(Error, appended)
          ? Task.rejected(appended) : Task.of(appended);
      }).orElse(err => {
        return logger.logError(config, context, err);
      });
  };
};

/**
 * Takes a stage function and decorate it with
 * pre and post processing elements of the pipeline.
 * @param {Function} fn - Stage function to decorate.
 * @returns {Function} - A stage function amplified with additional
 * functionality.
 */
const enrichStage = fn => {
  if (fn.__pipeline) {
    return fn;
  }

  fn.config = fn.config || {};
  fn.config.name = fn.config.name || fn.name || 'anonymous-function';

  return R.pipeK(
    logger.logStart(fn.config),
    invokeStage(fn, fn.config),
    logger.logEnd(fn.config),
    context => Task.of(context.clone()) // Clone it for next stage.
  );
};

const addConfigurationUtils = (fn, config) => {
  fn.as = name => {
    config.name = name;
    return fn;
  };

  return fn;
};

const initContext = props =>
  Task.of(ctx.isContext(props) ? props : ctx.newContext(props));

const extractProps = context =>
  Task.of(ctx.isContext(context) ? ctx.extractProps(context) : context);

/**
 * Take a list of stage functions, amplifies them with additional logging
 * functions and composes a pipeline from it.
 * @param {Function} args - List of stage functions to pipeline.
 * @returns {Function} - A function that can be invoke to execute the pipeline.
 */
function createPipeline(...args) {
  const plConfig = {};
  let fns = R.concat([
    initContext,
    logger.logStartPipeline(plConfig)],
    R.map(enrichStage, args));

  fns = R.concat(fns, [
    logger.logEndPipeline(plConfig),
    extractProps]);

  const f = R.pipeK(...fns);
  f.__pipeline = true;

  return addConfigurationUtils(f, plConfig);
}

module.exports = createPipeline;
