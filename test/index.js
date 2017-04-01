import Task from 'data.task';
import sinon from 'sinon';
import chai from 'chai';
import { curry, is } from 'ramda';
import proxyquire from 'proxyquire';
import Context from '../src/context';

const f1 = context => {
  return Task.of({ foo: 'a' });
};

f1.config = { name: 'f1' };

const f2 = context => {
  return Task.of({ bar: 'b' });
};

f2.config = { name: 'f2' };

describe('pipeline', () => {
  let context;
  let createPipeline;
  let pipeline;
  let spiedF1;
  let spiedF2;
  let logStart;
  let logEnd;
  let logError;

  beforeEach(() => {
    logStart = sinon.spy((a, b) => Task.of(b));
    logEnd = sinon.spy((a, b) => Task.of(b));
    logError = sinon.spy((a, b) => Task.rejected(b));
    spiedF1 = sinon.spy(f1);
    spiedF2 = sinon.spy(f2);

    const mod = proxyquire('../src', {
      './logger': {
        logStart: curry(logStart),
        logEnd: curry(logEnd),
        logError: curry(logError),
        '@noCallThru': true,
        __esModule: true
      }
    });

    createPipeline = mod.default;
    context = {};
    pipeline = createPipeline(spiedF1, spiedF2);
  });

  it('should invoke all stages', () => {
    pipeline(context)
      .fork(chai.assert.isNotOk, context => {
        spiedF1.calledOnce.should.be.true;
        spiedF2.calledOnce.should.be.true;
      });
  });

  it('context should observe the side effects of all stages', () => {
    pipeline(context)
      .fork(chai.assert.isNotOk, context => {
        context.props.foo.should.equal('a');
        context.props.bar.should.equal('b');
      });
  });

  it('second stage should observe the side effects of first', () => {
    pipeline(context).fork(chai.assert.isNotOk, context => {
      spiedF2.getCall(0).args[0].props.foo.should.equal('a');
    });
  });

  it('should have an output of Context type', () => {
    pipeline(context).fork(chai.assert.isNotOk, o => {
      is(Context, o).should.be.true;
    });
  });

  it('should invoke logStart for each stage', () => {
    pipeline(context).fork(chai.assert.isNotOk, () => {
      logStart.calledWith(f1.config).should.be.true;
      logStart.calledWith(f2.config).should.be.true;
    });
  });

  it('should invoke logEnd with config for each stage', () => {
    pipeline(context).fork(chai.assert.isNotOk, () => {
      logEnd.calledWithMatch(f1.config).should.be.true;
      logEnd.calledWithMatch(f2.config).should.be.true;
    });
  });

  it('should generate a new EventLog for each stage', () => {
    pipeline(context).fork(chai.assert.isNotOk, () => {
      const a = spiedF1.getCall(0).args[0].log;
      const b = spiedF2.getCall(0).args[0].log;
      a.should.not.equal(b);
    });
  });

  it('should invoke the targets with an empty log', () => {
    pipeline(context).fork(chai.assert.isNotOk, () => {
      spiedF1.getCall(0).args[0].log.events.should.be.empty;
      spiedF2.getCall(0).args[0].log.events.should.be.empty;
    });
  });

  describe('function that does not return a Task', () => {
    beforeEach(() => {
      const badFunc = context => context;
      badFunc.config = { name: 'badFunc' };
      pipeline = createPipeline(spiedF1, badFunc, spiedF2);
    });

    it('should reject it if the function does not return Task', () => {
      pipeline(context).fork(chai.assert.isOk, chai.assert.isNotOk);
    });
  });

  describe('stage that throws an error', () => {
    let error = new Error('doh');
    let errorStage = () => { throw error; };
    errorStage.config = { name: 'error-stage' };

    beforeEach(() => {
      pipeline = createPipeline(spiedF1, errorStage, spiedF2);
    });

    it('should not invoke the next stage', () => {
      pipeline(context).fork(() => {
        spiedF2.neverCalledWith().should.be.true;
      }, chai.assert.isNotOk);
    });

    it('should invoke logError method in logger', () => {
      pipeline(context).fork(() => {
        logError.calledWith(errorStage.config, sinon.match.any, error)
          .should.be.true;
      }, chai.assert.isNotOk);
    });

    it('should not invoke logEnd method in logger', () => {
      pipeline(context).fork(() => {
        logEnd.neverCalledWith(errorStage.config).should.be.true;
      }, chai.assert.isNotOk);
    });
  });

  describe('stage that returns a rejection', () => {
    let rejection = { message: 'doh' };
    let errorStage = () => Task.rejected(rejection);
    errorStage.config = { name: 'error-stage' };

    beforeEach(() => {
      pipeline = createPipeline(spiedF1, errorStage, spiedF2);
    });

    it('should not invoke the next stage', () => {
      pipeline(context).fork(() => {
        spiedF2.neverCalledWith().should.be.true;
      }, chai.assert.isNotOk);
    });

    it('should invoke the logError method in logger', () => {
      pipeline(context).fork(() => {
        logError.calledWith(errorStage.config, sinon.match.any, rejection)
          .should.be.true;
      }, chai.assert.isNotOk);
    });

    it('should not invoke logEnd method in logger', () => {
      pipeline(context).fork(() => {
        logEnd.neverCalledWith(errorStage.config).should.be.true;
      }, chai.assert.isNotOk);
    });
  });

  describe('of single stage', () => {
    beforeEach(() => {
      pipeline = createPipeline(spiedF1);
    });

    it('should invoke the stage', () => {
      pipeline(context).fork(chai.assert.isNotOk, () => {
        spiedF1.calledOnce.should.be.true;
      });
    });
  });
});
