const R = require('ramda');
const Task = require('data.task');

const emptyString = i => /^\s*$/.test(i);

const createEvent = (type, data = {}) => {
  if (!R.is(String, type) || emptyString(type)) {
    throw new Error('eventType must be a valid string');
  }

  return { type, data };
};

const eventLogger = R.curry((events, type,  data) => {
  events.push(createEvent(type, data));

  return Task.of(data);
});

class EventLog {
  constructor() {
    this.events = [];
    this.info = eventLogger(this.events, 'info');
    this.warn = eventLogger(this.events, 'warn');
    this.error = eventLogger(this.events, 'error');
    this.debug = eventLogger(this.events, 'debug');
  }
}

const createEventLog = () => new EventLog();

module.exports = createEventLog;
