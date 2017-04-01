import { is, map } from 'ramda';

const isExcluded = (o) => !is(Object, o) || is(Function, o);

const toImmutable = (o) => {
  if (isExcluded(o) || is(Immutable, o)) {
    return o;
  }

  if (is(Array, o)) {
    return map(toImmutable, o);
  }

  return new Immutable(o);
};

export default class Immutable {
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
        return (key in target._input);
      },
      ownKeys(target) {
        return Object.keys(target._input);
      },
      set(target, key, value) {
        throw new TypeError(`Unable to set property ${key}`);
      }
    });
  }
};
