const Task = require('data.task');
const sinon = require('sinon');
const chai = require('chai');
const R = require('ramda');
const proxyquire = require('proxyquire');
const Context = require('../src/context').Context;

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

    createPipeline = proxyquire('../src', {
      './logger': {
        logStart: R.curry(logStart),
        logEnd: R.curry(logEnd),
        logError: R.curry(logError),
        '@noCallThru': true
      }
    });

    context = {};
    pipeline = createPipeline(spiedF1, spiedF2);
  });

  it('should invoke all stages', () => {
    pipeline(context)
      .fork(chai.assert.isNotOk, () => {
        spiedF1.calledOnce.should.be.true;
        spiedF2.calledOnce.should.be.true;
      });
  });

  it('context should observe the side effects of all stages', () => {
    pipeline(context)
      .fork(chai.assert.isNotOk, c => {
        c.props.foo.should.equal('a');
        c.props.bar.should.equal('b');
      });
  });

  it('second stage should observe the side effects of first', () => {
    pipeline(context).fork(chai.assert.isNotOk, () => {
      spiedF2.getCall(0).args[0].props.foo.should.equal('a');
    });
  });

  it('should have an output of Context type', () => {
    pipeline(context).fork(chai.assert.isNotOk, o => {
      R.is(Context, o).should.be.true;
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

  describe('stage that returns an object', () => {
    beforeEach(() => {
      const objectStage = c => ({ jar: 'a' });
      objectStage.config = { name: 'object-stage' };
      pipeline = createPipeline(spiedF1, objectStage, spiedF2);
    });

    it('should pass the value to next stage as a prop', () => {
      pipeline(context).fork(chai.assert.isNotOk, () => {
        spiedF2.getCall(0).args[0].props.jar.should.equal('a');
      });
    });
  });

  describe('stage that returns a simple value', () => {
    beforeEach(() => {
      const simpleStage = c => 42;
      simpleStage.config = { name: 'simple-stage' };
      pipeline = createPipeline(spiedF1, simpleStage, spiedF2);
    });

    it('should pass the value to next stage as a prop', () => {
      pipeline(context).fork(chai.assert.isNotOk, () => {
        spiedF2.getCall(0).args[0].props['simple-stage'].should.equal(42);
      });
    });
  });

  describe('stage that does not return a value', () => {
    beforeEach(() => {
      const voidStage = c => { };
      voidStage.config = { name: 'void-stage' };
      pipeline = createPipeline(spiedF1, voidStage, spiedF2);
    });

    it('should not invoke the next stage', () => {
      pipeline(context).fork(chai.assert.isNotOk, () => {
        spiedF2.calledOnce.should.be.true;
      });
    });

    it('should not attach any props', () => {
      pipeline(context).fork(chai.assert.isNotOk, c => {
        (c.props.f2 === undefined).should.be.true;
      });
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

  describe('with just one stage', () => {
    beforeEach(() => {
      pipeline = createPipeline(spiedF1);
    });

    it('should invoke the stage', () => {
      pipeline(context).fork(chai.assert.isNotOk, () => {
        spiedF1.calledOnce.should.be.true;
      });
    });
  });

  describe('stage without a valid name', () => {
    it('should throw an error', () => {
      const s = () => { };
      s.config = {};
      (() => createPipeline(spiedF1, s, spiedF2))
        .should.throw(/Config must specify a name/);
    });
  });
});
