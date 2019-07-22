import isObject from './isObject.js'

const toString = Object.prototype.toString;

function getTag(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]'
  }
  return toString.call(value)
}

export default function isFunction(value) {
  if (!isObject(value)) {
    return false
  }
  const tag = getTag(value);
  return tag === '[object Function]' ||
    tag === '[object AsyncFunction]' ||
    tag === '[object GeneratorFunction]'
    || tag === '[object Proxy]';
}