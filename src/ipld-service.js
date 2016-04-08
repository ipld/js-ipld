'use strict'

const isIPFS = require('is-ipfs')

class IPLDService {
  constructor (blockService) {
    if (!blockService) {
      throw new Error('IPLDService requires a BlockService instance')
    }

    this.bs = blockService
  }

  add (node, cb) {
  }

  get (multihash, cb) {
  }

  getRecursive (multihash, cb) {
  }

  remove (multihash, cb) {
    if (!multihash || !isIPFS.multihash(multihash)) {
      return cb(new Error('Invalid multihash'))
    }

    this.bs.deleteBlock(multihash, cb)
  }
}

module.exports = IPLDService
