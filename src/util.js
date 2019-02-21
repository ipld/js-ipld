'use strict'

exports.first = async (iterator) => {
  for await (const value of iterator) {
    return value
  }
}

exports.last = async (iterator) => {
  let value
  for await (value of iterator) {
    // Intentionally empty
  }
  return value
}

exports.all = async (iterator) => {
  const values = []
  for await (const value of iterator) {
    values.push(value)
  }
  return values
}

exports.extendIterator = (iterator) => {
  iterator.first = () => exports.first(iterator)
  iterator.last = () => exports.last(iterator)
  iterator.all = () => exports.all(iterator)
  return iterator
}
