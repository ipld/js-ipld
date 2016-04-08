'use strict'

const isIPFS = require('is-ipfs')
const Block = require('ipfs-blocks').Block
const ipld = require('ipld')
const base58 = require('bs58')

const utils = require('./utils')

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
      this._getWith(multihash, cb)
    }

    if (isPath) {
      const ipfsKey = multihash.replace('/ipfs/', '')
      this._getWith(ipfsKey, cb)
    }
  }

  _getWith (key, cb) {
    let formatted = key

    if (typeof key === 'string') {
      formatted = new Buffer(base58.decode(key))
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
    const self = this
    function getter (multihash, linkStack, nodeStack, cb) {
      self.get(multihash, (err, node) => {
        if (err && nodeStack.length > 0) {
          return cb(new Error('Could not complete the recursive get', nodeStack))
        }

        if (err) {
          return cb(err)
        }

        nodeStack.push(node)
        linkStack = linkStack.concat(utils.getKeys(node))

        const next = linkStack.pop()

        if (next) {
          return getter(next, linkStack, nodeStack, cb)
        }

        cb(null, nodeStack)
      })
    }

    getter(multihash, [], [], cb)
  }

  remove (multihash, cb) {
    if (!multihash || !isIPFS.multihash(multihash)) {
      return cb(new Error('Invalid multihash'))
    }

    this.bs.deleteBlock(multihash, 'ipld', cb)
  }
}

module.exports = IPLDService
