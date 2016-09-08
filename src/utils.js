'use strict'

const flatten = require('lodash.flatten')
const ipld = require('ipld')

const LINK_SYMBOL = ipld.LINK_SYMBOL

exports = module.exports

// Recursively find all LINK_SYMBOL values in a given node
exports.getKeys = (node) => {
  return flatten(Object.keys(node).map((key) => {
    if (key === LINK_SYMBOL) {
      return node[key]
    }

    if (node[key] && typeof node[key] === 'object') {
      return exports.getKeys(node[key])
    }

    return []
  }))
}
