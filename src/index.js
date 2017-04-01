import { prepend, append, pipeK, map, is } from 'ramda';
import Task from 'data.task';
import { logStart, logEnd, logError } from './logger';
import Context, { appendToContext } from './context';

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
const wrap = (fn, config) => {
  return context => {
    const r = callUserStageSafe(fn, context);
    if (!(r instanceof Task)) {
      return Task.rejected(`function ${config.name} did not return a Task`);
    }

    return r.chain(props => {
      // If stage is returning the context we don't need to worry about
      // merging the result in.
      if (props === context) {
        return Task.of(context);
      }

      // Append the props to context.
      let appended;
      if (is(Object, props)) {
        appended = appendToContext(context, props);
      } else {
        const w = {};
        w[config.name] = props;
        appended = appendToContext(context, w);
      }

      return is(Error, appended)
        ? Task.rejected(appended) : Task.of(appended);
    }).orElse(err => logError(config, context, err));
  };
};

/**
 * Takes a stage function and decorate it with
 * pre and post processing elements of the pipeline.
 * @param {Function} fn - Stage function to decorate.
 * @returns {Function} - A stage function amplified with additional
 * functionality.
 */
const traced = fn => {
  if (!fn.config) {
    return fn;
  }

  if (!fn.config.name) {
    throw new Error('Config must specify a name');
  };

  return pipeK(
    logStart(fn.config),
    wrap(fn, fn.config),
    logEnd(fn.config),
    context => Task.of(context.clone()) // Clone it for next stage.
  );
};

const echo = c => Task.of(c);
const ensureContext = context => is(Context, context)
  ? Task.of(context) : Task.of(new Context(context));

/**
 * Take a list of stage functions, amplifies them with additional logging
 * functions and composes a pipeline from it.
 * @param {Function} args - List of stage functions to pipeline.
 * @returns {Function} - A function that can be invoke to execute the pipeline.
 */
export function createPipeline(...args) {
  // Ensure that the input is always transformed to an instance of Context.
  let fns = prepend(ensureContext, map(traced, args));
  // ramda pipeK requires at least 2 functions.
  // Therefore we always attach echo function to the end of the pipeline.
  fns = append(echo, fns);
  return pipeK(...fns);
};

export default createPipeline;
