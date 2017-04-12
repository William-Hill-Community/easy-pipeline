const Task = require('data.task');
const R = require('ramda');
const consoleLogger = require('./consoleLogger');

let loggers = [consoleLogger];

// Creates logger options object with provided state, context and error.
// Then chains it over the provided list of logger methods.
// Finally, appends a function that can return the original context
// used in the pipeline.
const createChainedLogger = (list, config, context, error) => {
  let t = R.head(list)({ config, context, error });
  for (let c of R.tail(list)) {
    t = t.chain(c);
  }
  return t.chain(() => Task.of(context));
};

const logStartPipeline = R.curry((pipeline, context) => {
  const spChain = R.map(l => l.logStartPipeline.bind(l), loggers);
  return createChainedLogger(spChain, pipeline, context);
});

const logEndPipeline = R.curry((pipeline, context) => {
  const spChain = R.map(l => l.logEndPipeline.bind(l), loggers);
  return createChainedLogger(spChain, pipeline, context);
});

const logStart = R.curry((stage, context) => {
  const startChain = R.map(l => l.logStart.bind(l), loggers);
  return createChainedLogger(startChain, stage, context);
});

const logEnd = R.curry((stage, context) => {
  const endChain = R.map(l => l.logEnd.bind(l), loggers);
  return createChainedLogger(endChain, stage, context);
});

const logError = R.curry((stage, context, error) => {
  const errorChain = R.map(l => l.logError.bind(l), loggers);
  return createChainedLogger(errorChain, stage, context, error)
    .chain(() => Task.rejected(error));
});

const registerLogger = logger => {
  if (!R.is(Function), logger.logStartPipeline) {
    throw new Error('Logger must have a valid logStartPipeline function.');
  }

  if (!R.is(Function), logger.logEndPipeline) {
    throw new Error('Logger must have a valid logEndPipeline function.');
  }

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
  logStartPipeline, logEndPipeline, logStart, logEnd, logError, registerLogger
};
