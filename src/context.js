const R = require('ramda');
const createEventLog = require('./createEventLog');
const Immutable = require('easy-immutable');

const conflict = p =>
  new Error(`Cannot merge an existing property '${p}'`);

const mergeMap = (newMap, name, oldMap = {}) => {
  if (!R.is(Object, oldMap)) {
    return conflict(name);
  }

  for (let p of Object.getOwnPropertyNames(newMap)) {
    if (oldMap[p]) {
      return conflict(p);
    }
    oldMap[p] = newMap[p];
  }
  return oldMap;
};

const mergeArray = (newArray, name, oldArray = []) => {
  if (!R.is(Array, oldArray)) {
    return conflict(name);
  }

  for (let i of newArray) {
    oldArray.push(i);
  }
  return oldArray;
};

const appendToContext = (context, newProps) => {
  let currentProps = context._props;

  for (let p of Object.getOwnPropertyNames(newProps)) {
    const prop = newProps[p];
    let result;
    if (R.is(Array, prop)) {
      result = mergeArray(prop, p, currentProps[p]);
    } else if (R.is(Object, prop)) {
      result = mergeMap(prop, p, currentProps[p]);
    } else {
      result = currentProps[p] ? conflict(p) : prop;
    }

    if (R.is(Error, result)) {
      return result;
    }

    currentProps[p] = result;
  }

  return context;
};

const extractProps = context => context._props;

/**
 * Context is type used to share data/services between independent stages
 * in a pipeline.
 */
class Context {
  constructor(props = {}) {
    this.props = new Immutable(props);
    this._props = props;
    this.log = createEventLog();
  }

  /**
   * clone creates a clone of the current context This resets context
   * related services such as log.
   * @param {Context} context - Context from the previous stage.
   * @returns {Object} - Instance of eventLog object.
   */
  clone() {
    return new Context(this._props);
  }
}

module.exports.newContext = props => new Context(props);
module.exports.appendToContext = appendToContext;
module.exports.extractProps = extractProps;
module.exports.isContext = context => R.is(Context, context);
