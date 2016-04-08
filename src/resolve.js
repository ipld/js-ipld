'use strict'

const isIPFS = require('is-ipfs')
const includes = require('lodash.includes')

const IPLDService = require('./ipld-service')

module.exports = function resolve (is, path, cb) {
  if (!(is instanceof IPLDService)) {
    return cb(new Error('Missing IPLDService'))
  }

  function access (parts, obj, cb) {
    if (!obj && !isIPFS.multihash(parts[0])) {
      return cb(new Error('No root object provided'))
    }

    if (parts.length === 0) {
      return cb(null, obj)
    }

    const next = parts.shift()

    if (isIPFS.multihash(next)) {
      is.get(next, (err, block) => {
        if (err) {
          return cb(err)
        }

        access(parts, block, cb)
      })
    } else if (!includes(Object.keys(obj), next) && obj['@link']) {
      // resolve links in objects with an @link property
      is.get(obj['@link'], (err, block) => {
        if (err) {
          return cb(err)
        }
        // Put back so it's resolved in the next node
        parts.unshift(next)
        access(parts, block, cb)
      })
    } else {
      access(parts, obj[next], cb)
    }
  }

  access(path.split('/'), null, cb)
}
