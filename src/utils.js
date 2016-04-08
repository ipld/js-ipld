'use strict'

const flatten = require('lodash.flatten')

exports = module.exports

// Recursively find all '@link' values in a given node
exports.getKeys = (node) => {
  return flatten(Object.keys(node).map((key) => {
    if (key === '@link') {
      return node[key]
    }

    if (node[key] && typeof node[key] === 'object') {
      return exports.getKeys(node[key])
    }

    return []
  }))
}
