import Immutable from '../src/immutable';

describe('validating the immutable class', () => {
  it('should make an immutable', () => {
    let output = new Immutable({ hello: 'test' });
    output.hello.should.equal('test');
  });

  it('should not allow setting existing value', () => {
    let output = new Immutable({ hello: 'test', test: 'value-one' });

    (() => { output.hello = 'value-two'; }).should.throw(TypeError);
  });

  it('should not allow new values', () => {
    let output = new Immutable({ hello: 'test', test: 'value-one' });

    (() => { output.second = 'value-two'; }).should.throw(TypeError);
  });

  it('should clone nested objects', () => {
    let bottom = { bottom: 'test' };
    let middle = { middle: bottom, nest: 'value' };
    let output = new Immutable({ top: middle });

    output.top.middle.bottom.should.equal('test');
    output.top.nest.should.equal('value');
  });

  it('should not double wrap', () => {
    const inner = {test: 'a'};
    const outer = new Immutable(inner);

    outer.test.should.equal('a');
  });

  it('should make immutable arrays', () => {
    let item = new Immutable({ test: ['a', 'b'] });
    item.test[0].should.equal('a');

    item = new Immutable({test: [{one: 'test one'}, {two: 'test two'}]});
    item.test[0].one.should.equal('test one');
  });

  it('should handle functions', () => {
    let item = { add: (x, y) => { return x + y; } };
    const test = new Immutable(item);

    (typeof test.add).should.equal('function');
    test.add(1, 2).should.equal(3);
  });
});
