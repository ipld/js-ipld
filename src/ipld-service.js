'use strict'

const isIPFS = require('is-ipfs')
const Block = require('ipfs-block')
const ipld = require('ipld')
const pull = require('pull-stream')
const traverse = require('pull-traverse')
const mh = require('multihashes')

const utils = require('./utils')

module.exports = class IPLDService {
  constructor (blockService) {
    if (!blockService) {
      throw new Error('IPLDService requires a BlockService instance')
    }

    this.bs = blockService
  }

  put (node, cb) {
    cb = cb || noop
    pull(
      pull.values([node]),
      this.putStream(cb)
    )
  }

  putStream (cb) {
    cb = cb || noop
    return pull(
      pull.map((node) => {
        if (!(node instanceof Buffer)) {
          node = ipld.marshal(node)
        }

        return new Block(node, 'ipld')
      }),
      this.bs.putStream(),
      pull.onEnd(cb)
    )
  }

  get (key, cb) {
    pull(
      this.getStream(key),
      pull.collect((err, res) => {
        if (err) return cb(err)
        cb(null, res[0])
      })
    )
  }

  getStream (key) {
    const normalizedKey = normalizeKey(key)

    if (!normalizedKey) {
      return pull.error(new Error('Invalid Key'))
    }

    return pull(
      this.bs.getStream(normalizedKey, 'ipld'),
      pull.map((block) => ipld.unmarshal(block.data))
    )
  }

  getRecursive (key, cb) {
    pull(
      this.getRecursiveStream(key),
      pull.collect(cb)
    )
  }

  getRecursiveStream (key) {
    return pull(
      this.getStream(key),
      pull.map((node) => traverse.widthFirst(node, (node) => {
        return pull(
          pull.values(utils.getKeys(node)),
          pull.map((link) => this.getStream(link)),
          pull.flatten()
        )
      })),
      pull.flatten()
    )
  }

  remove (keys, cb) {
    this.bs.delete(keys, 'ipld', cb)
  }
}

function noop () {}

function normalizeKey (key) {
  let res
  const isMhash = isIPFS.multihash(key)
  const isPath = isIPFS.path(key)

  if (!isMhash && !isPath) {
    return null
  }

  if (isMhash) {
    res = key
  } else if (isPath) {
    res = key.replace('/ipfs/', '')
  }

  if (typeof res === 'string') {
    return mh.fromB58String(res)
  }

  return res
}
