/* eslint-disable no-console */
const Task = require('data.task');
const chalk = require('chalk');
const logfmt = require('logfmt');

let debug = false;
const colors = {
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  debug: chalk.green
};

const defaultFormatter = e => {
  const color = colors[e.type];
  return `${color(e.type.toUpperCase())} ${e.name} ${logfmt.stringify(e.data)}`;
};

const logEvents = options => {
  for (let e of options.context.log.events) {
    console.log(defaultFormatter(e));
  }
};

const pipelineName = options => options.name ? ` ${options.name} ` : ' ';

const logStartPipeline = options => {
  console.log(`Pipeline${pipelineName(options.config)}started`);
  return Task.of(options);
};

const logEndPipeline = options => {
  console.log(`Pipeline${pipelineName(options.config)}finished`);
  return Task.of(options);
};

const logStart = options => {
  console.log(`${options.config.name} started`);
  if (debug) {
    console.log(options.context);
  }
  return Task.of(options);
};

const logEnd = options => {
  logEvents(options);
  console.log(`${options.config.name} finished`);
  return Task.of(options);
};

const logError = options => {
  logEvents(options);
  console.log(`${chalk.red('ERROR')} ${options.error}`);
  if (options.error.stack) {
    console.log(options.error.stack);
  }

  return Task.of(options);
};

const enableDebug = () => {
  debug = true;
};

module.exports = {
  logStartPipeline, logEndPipeline, logStart, logEnd, logError, enableDebug
};
