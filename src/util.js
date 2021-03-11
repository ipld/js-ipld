'use strict'

/**
 * @template T
 *
 * @param {AsyncIterable<T>} iterator
 */
exports.first = async (iterator) => {
  for await (const value of iterator) { // eslint-disable-line no-unreachable-loop
    return value
  }
}

/**
 * @template T
 *
 * @param {AsyncIterable<T>} iterator
 */
exports.last = async (iterator) => {
  let value
  for await (value of iterator) {
    // Intentionally empty
  }
  return value
}

/**
 * @template T
 *
 * @param {AsyncIterable<T>} iterator
 */
exports.all = async (iterator) => {
  const values = []
  for await (const value of iterator) {
    values.push(value)
  }
  return values
}

/**
 * @template T
 *
 * @typedef {object} Extensions
 * @property {() => Promise<T | undefined>} first
 * @property {() => Promise<T | undefined>} last
 * @property {() => Promise<T[]>} all
 */

/**
 * @template T
 *
 * @param {any} iterator
 * @returns {AsyncIterable<T> & Extensions<T> }
 */
exports.extendIterator = (iterator) => {
  iterator.first = () => exports.first(iterator)
  iterator.last = () => exports.last(iterator)
  iterator.all = () => exports.all(iterator)
  return iterator
}
