import Task from 'data.task';
import { curry, is, head, tail, map } from 'ramda';
import consoleLogger from './consoleLogger';

let loggers = [consoleLogger];

// Creates logger options object with provided state, context and error.
// Then chains it over the provided list of logger methods.
// Finally, appends a function that can return the original context
// used in the pipeline.
const createLogChain = (loggers, stage, context, error) => {
  let t = head(loggers)({ stage, context, error });
  for (let c of tail(loggers)) {
    t = t.chain(c);
  }
  return t.chain(() => Task.of(context));
};

export const logStart = curry((stage, context) => {
  const startChain = map(l => l.logStart.bind(l), loggers);
  return createLogChain(startChain, stage, context);
});

export const logEnd = curry((stage, context) => {
  const endChain = map(l => l.logEnd.bind(l), loggers);
  return createLogChain(endChain, stage, context);
});

export const logError = curry((stage, context, error) => {
  const errorChain = map(l => l.logError.bind(l), loggers);
  return createLogChain(errorChain, stage, context, error)
    .chain(() => Task.rejected(error));
});

export const registerLogger = logger => {
  if (!is(Function, logger.logStart)) {
    throw new Error('Logger must have a valid logStart function.');
  }

  if (!is(Function, logger.logEnd)) {
    throw new Error('Logger must have a valid logEnd function.');
  }

  if (!is(Function, logger.logError)) {
    throw new Error('Logger must have a valid logError function.');
  }

  loggers.push(logger);
};

