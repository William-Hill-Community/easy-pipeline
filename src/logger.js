const Task = require('data.task');
const R = require('ramda');
const consoleLogger = require('./consoleLogger');

let loggers = [consoleLogger];

// Creates logger options object with provided state, context and error.
// Then chains it over the provided list of logger methods.
// Finally, appends a function that can return the original context
// used in the pipeline.
const createLogChain = (list, stage, context, error) => {
  let t = R.head(list)({ stage, context, error });
  for (let c of R.tail(list)) {
    t = t.chain(c);
  }
  return t.chain(() => Task.of(context));
};

const logStart = R.curry((stage, context) => {
  const startChain = R.map(l => l.logStart.bind(l), loggers);
  return createLogChain(startChain, stage, context);
});

const logEnd = R.curry((stage, context) => {
  const endChain = R.map(l => l.logEnd.bind(l), loggers);
  return createLogChain(endChain, stage, context);
});

const logError = R.curry((stage, context, error) => {
  const errorChain = R.map(l => l.logError.bind(l), loggers);
  return createLogChain(errorChain, stage, context, error)
    .chain(() => Task.rejected(error));
});

const registerLogger = logger => {
  if (!R.is(Function, logger.logStart)) {
    throw new Error('Logger must have a valid logStart function.');
  }

  if (!R.is(Function, logger.logEnd)) {
    throw new Error('Logger must have a valid logEnd function.');
  }

  if (!R.is(Function, logger.logError)) {
    throw new Error('Logger must have a valid logError function.');
  }

  loggers.push(logger);
};

module.exports = {
  logStart, logEnd, logError, registerLogger
};
