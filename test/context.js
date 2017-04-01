const ctx = require('../src/context');

describe('context', () => {
  describe('append', () => {
    it('should append new value properties', () => {
      const c = ctx.appendToContext(new ctx.Context(), { a: 'foo' });
      c.props.a.should.equal('foo');
    });

    it('should append new values in maps', () => {
      const c = ctx.appendToContext(new ctx.Context({ a: { b: 'b' } }), { a: { c: 'c' } });
      c.props.a.b.should.equal('b');
      c.props.a.c.should.equal('c');
    });

    it('should append new values in arrays', () => {
      const c = ctx.appendToContext(new ctx.Context({ a: ['a'] }), { a: ['b'] });
      c.props.a.should.contain('a');
      c.props.a.should.contain('b');
    });

    it('should not overwrite existing value properties', () => {
      const c = ctx.appendToContext(new ctx.Context({ a: 'foo' }), { a: 'bar' });
      c.should.be.a('Error');
    });

    it('should not overwrite existing members of a map', () => {
      const c = ctx.appendToContext(new ctx.Context({ a: { b: 'b' } }), { a: { b: 'b' } });
      c.should.be.a('Error');
    });

    it('should not overwrite existing non-map property', () => {
      const c = ctx.appendToContext(new ctx.Context({ a: 'foo' }), { a: { b: 'b' } });
      c.should.be.a('Error');
    });

    it('should not overwrite existing non-array property', () => {
      const c = ctx.appendToContext(new ctx.Context({ a: 'foo' }), { a: ['a'] });
      c.should.be.a('Error');
    });
  });
});
