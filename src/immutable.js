const R = require('ramda');

const isExcluded = (o) => !R.is(Object, o) || R.is(Function, o);

const toImmutable = (o) => {
  if (isExcluded(o) || R.is(Immutable, o)) {
    return o;
  }

  if (R.is(Array, o)) {
    return R.map(toImmutable, o);
  }

  return new Immutable(o);
};

class Immutable {
  constructor(input) {
    this._input = input;
    return new Proxy(this, {
      enumerate(target) {
        return Object.keys(target._input);
      },
      get(target, prop) {
        if (prop in target._input) {
          return toImmutable(target._input[prop]);
        }
        return undefined;
      },
      getOwnPropertyDescriptor(target, key) {
        const val = target._input[key];
        return val
          ? {
            value: val,
            writable: false,
            enumerable: true,
            configurable: true
          }
          : undefined;
      },
      has(target, key) {
        return key in target._input;
      },
      ownKeys(target) {
        return Object.keys(target._input);
      },
      set(target, key, value) { // eslint-disable-line
        throw new TypeError(`Unable to set property ${key}`);
      }
    });
  }
}

module.exports = Immutable;
