import { is } from 'ramda';
import eventLog from './eventLog';
import Immutable from './immutable';

const conflict = p =>
  new Error(`Cannot merge an existing property '${p}'`);

const mergeMap = (newMap, name, oldMap = {}) => {
  if (!is(Object, oldMap)) {
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
  if (!is(Array, oldArray)) {
    return conflict(name);
  }

  for (let i of newArray) {
    oldArray.push(i);
  }
  return oldArray;
};

export const appendToContext = (context, newProps) => {
  var currentProps = context._props;

  for (let p of Object.getOwnPropertyNames(newProps)) {
    const prop = newProps[p];
    let result;
    if (is(Array, prop)) {
      result = mergeArray(prop, p, currentProps[p]);
    } else if (is(Object, prop)) {
      result = mergeMap(prop, p, currentProps[p]);
    } else {
      result = currentProps[p] ? conflict(p) : prop;
    }

    if (is(Error, result)) {
      return result;
    }

    currentProps[p] = result;
  }

  return context;
};

/**
 * Context is type used to share data/services between independent stages
 * in a pipeline.
 */
export default class Context {
  constructor(props = {}) {
    this.props = new Immutable(props);
    this._props = props;
    this.log = eventLog();
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
};
