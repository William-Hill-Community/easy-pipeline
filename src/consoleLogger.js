import Task from 'data.task';
import { white, red } from 'chalk';

const highlight = s => s;
let debug = false;
let nextColor = white;

const noop = () => { };

const resourceEventFormatter = e => {
  return `${nextColor(highlight(e.type))} ` +
    nextColor(`${highlight(e.data.type)} ${e.data.name}`);
};

const commandOutputFormatter = noop;
const commandErrorFormatter = noop;

const defaultFormatter = JSON.stringify;

const formatters = {
  'resource-discovered': resourceEventFormatter,
  'resource-created': resourceEventFormatter,
  'resource-updated': resourceEventFormatter,
  'resource-deleted': resourceEventFormatter,
  'command-output': commandOutputFormatter,
  'command-error': commandErrorFormatter
};

const logEvents = options => {
  for (let e of options.context.log.events) {
    const f = formatters[e.type] || defaultFormatter;
    const formatted = f(e);
    if (formatted) {
      console.log(`${nextColor(options.stage.name)} ${formatted}`);
    }
  }
};

const logStart = options => {
  console.log(`${nextColor(options.stage.name)} ${nextColor('started')}`);
  if (debug) {
    console.log(options.context);
  }
  return Task.of(options);
};

const logEnd = options => {
  logEvents(options);
  console.log(`${nextColor(options.stage.name)} ${nextColor('finished')}`);
  return Task.of(options);
};

const logError = options => {
  logEvents(options);
  console.log(`${red('Error')} ${options.error}`);
  if (options.error.stack) {
    console.log(options.error.stack);
  }

  return Task.of(options);
};

export default {
  logStart, logEnd, logError
};

export const enableDebug = () => {
  debug = true;
};
