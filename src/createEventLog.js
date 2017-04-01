const R = require('ramda');
const Task = require('data.task');

const emptyString = i => /^\s*$/.test(i);

const resourceEventData = (eventType, type, name, data = {}) => {
  if (!R.is(String, eventType) || emptyString(eventType)) {
    throw new Error('eventType must be a valid string');
  }

  if (!R.is(String, name) || emptyString(name)) {
    throw new Error('name must be a valid string');
  }

  if (!R.is(String, type) || emptyString(type)) {
    throw new Error('type must be a valid string');
  }

  return { type, name, data };
};

const resourceEventLogger = R.curry((events, eventType, type, name, data) => {
  events.push({
    type: eventType,
    data: resourceEventData(eventType, type, name, data)
  });

  return Task.of(data);
});

const commandOutputLogger = R.curry((events, eventType, data) => {
  events.push({
    type: eventType,
    data
  });

  return Task.of(data);
});

class EventLog {
  constructor() {
    this.events = [];
    this.discovered = resourceEventLogger(this.events, 'resource-discovered');
    this.created = resourceEventLogger(this.events, 'resource-created');
    this.updated = resourceEventLogger(this.events, 'resource-updated');
    this.deleted = resourceEventLogger(this.events, 'resource-deleted');
    this.commandOutput = commandOutputLogger(this.events, 'command-output');
    this.commandError = commandOutputLogger(this.events, 'command-error');
  }
}

const createEventLog = () => new EventLog();

module.exports = createEventLog;
