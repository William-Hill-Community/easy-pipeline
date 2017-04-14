const createEventLog = require('../src/createEventLog.js');


describe('event log', () => {
  it('should work without the name', () => {
    const logger = createEventLog();
    logger.debug('sample message');
    logger.events[0].data.should.equal('sample message');
  });
});
