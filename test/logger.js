const chai = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const Task = require('data.task');

describe('logger', () => {
  let logger;
  let defaultLogStart;
  let defaultLogEnd;
  let defaultLogError;
  let context;
  let stage;

  beforeEach(() => {
    stage = {
      name: 'test-stage'
    };

    context = {
      log: {
        events: []
      }
    };

    defaultLogStart = sinon.spy(o => Task.of(o));
    defaultLogEnd = sinon.spy(o => Task.of(o));
    defaultLogError = sinon.spy(o => Task.of(o));

    logger = proxyquire('../src/logger', {
      './consoleLogger': {
        logStart: defaultLogStart,
        logEnd: defaultLogEnd,
        logError: defaultLogError,
        '@noCallThru': true
      }
    });
  });

  it('should invoke default logStart', () => {
    logger.logStart(stage, context).fork(chai.assert.isNotOk, () => {
      defaultLogStart.calledWith({
        stage, context, error: undefined
      }).should.be.true;
    });
  });

  it('should invoke default logEnd', () => {
    logger.logEnd(stage, context).fork(chai.assert.isNotOk, () => {
      defaultLogEnd.calledWith({
        stage, context, error: undefined
      }).should.be.true;
    });
  });

  describe('registering a logger', () => {
    let otherLogger;

    beforeEach(() => {
      otherLogger = {
        logStart: sinon.spy(o => Task.of(o)),
        logEnd: sinon.spy(o => Task.of(o)),
        logError: sinon.spy(o => Task.of(o))
      };

      logger.registerLogger(otherLogger);
    });

    it('should invoke the other logger logStart', () => {
      logger.logStart(stage, context).fork(chai.assert.isNotOk, () => {
        otherLogger.logStart.calledWith({
          stage, context, error: undefined
        }).should.be.true;
      });
    });

    it('should invoke the other logger logEnd', () => {
      logger.logEnd(stage, context).fork(chai.assert.isNotOk, () => {
        otherLogger.logEnd.calledWith({
          stage, context, error: undefined
        }).should.be.true;
      });
    });

    it('should invoke default logStart', () => {
      logger.logStart(stage, context).fork(chai.assert.isNotOk, () => {
        defaultLogStart.calledWith({
          stage, context, error: undefined
        }).should.be.true;
      });
    });

    it('should invoke default logEnd', () => {
      logger.logEnd(stage, context).fork(chai.assert.isNotOk, () => {
        defaultLogEnd.calledWith({
          stage, context, error: undefined
        }).should.be.true;
      });
    });
  });

  describe('logger state', () => {
    class StatefulLogger {
      logStart(options) {
        this.started = true;
        return Task.of(options);
      }

      logEnd(options) {
        this.ended = true;
        return Task.of(options);
      }

      logError(options) {
        this.error = true;
        return Task.of(options);
      }
    }

    it('should be preserved', () => {
      const sl = new StatefulLogger();
      logger.registerLogger(sl);
      logger.logStart(stage, context).fork(chai.assert.isNotOk, () => {
        sl.started.should.be.true;
      });
    });
  });
});
