'use strict'

const isIPFS = require('is-ipfs')
const Block = require('ipfs-blocks').Block
const ipld = require('ipld')
const base58 = require('bs58')

class IPLDService {
  constructor (blockService) {
    if (!blockService) {
      throw new Error('IPLDService requires a BlockService instance')
    }

    this.bs = blockService
  }

  add (node, cb) {
    if (!(node instanceof Buffer)) {
      node = ipld.marshal(node)
    }

    this.bs.addBlock(new Block(node, 'ipld'), cb)
  }

  get (multihash, cb) {
    const isMhash = isIPFS.multihash(multihash)
    const isPath = isIPFS.path(multihash)

    if (!isMhash && !isPath) {
      return cb(new Error('Invalid Key'))
    }

    if (isMhash) {
      this.getWith(multihash, cb)
    }

    if (isPath) {
      const ipfsKey = multihash.replace('/ipfs/', '')
      this.getWith(ipfsKey, cb)
    }
  }

  getWith (key, cb) {
    let formatted = key

    if (typeof key === 'string') {
      formatted = new Buffer(base58(key))
    }

    this.bs.getBlock(formatted, 'ipld', (err, block) => {
      if (err) {
        return cb(err)
      }

      let node

      try {
        node = ipld.unmarshal(block.data)
      } catch (err) {
        return cb(err)
      }

      return cb(null, node)
    })
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
