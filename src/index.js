'use strict';

var R = require('ramda');
var Task = require('data.task');
var logger = require('./logger');
var ctx = require('./context');

/**
 * Takes a stage function and invokes it with an exception handler.
 * If stage function (written by user) fails with an unhandled exception
 * this wrapper takes care of transforming it to a {Task} so that rest
 * of the pipeline can take appropriate actions.
 * @param {Function} fn - Stage function to invoke.
 * @param {Context} context - Context for stage function.
 * @returns {Task} - Task returned by the original stage or a rejection.
 */
const callUserStageSafe = (fn, context) => {
  try {
    return fn(context);
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
    let r = callUserStageSafe(fn, context);
    if (!(r instanceof Task)) {
      r = Task.of(r);
    }

    return r.chain(props => {
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
    }).orElse(err => logger.logError(config, context, err));
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
  // Ensure that the input is always transformed to an instance of Context.
  let fns = R.prepend(initContext, R.map(enrichStage, args));
  fns = R.append(extractProps, fns);
  const f = R.pipeK(...fns);
  f.__pipeline = true;
  return f;
};

module.exports = createPipeline;
