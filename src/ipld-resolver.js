'use strict'

// const isIPFS = require('is-ipfs')
const Block = require('ipfs-block')
// const ipld = require('ipld-dag-cbor')
const pull = require('pull-stream')
const traverse = require('pull-traverse')
// const mh = require('multihashes')
const dagPB = require('ipld-dag-pb')

const utils = require('./utils')

module.exports = class IPLDResolver {
  constructor (blockService) {
    // TODO instead of throwing, just create an in-memory
    // block-service, so it is nice for demos
    if (!blockService) {
      throw new Error('IPLDService requires a BlockService instance')
    }

    this.bs = blockService
    this.resolvers = {}
    this.support(dagPB.resolver.multicodec, dagPB.resolver)
  }

  // Adds support for an IPLD format
  // default ones are dag-pb and dag-cbor
  support (multicodec, resolver) {
    this.resolvers[multicodec] = resolver
  }

  resolve (cid, path) {
    // TODO
  }

  put (node, callback) {
    callback = callback || noop
    pull(
      pull.values([node]),
      this.putStream(callback)
    )
  }

  putStream (callback) {
    callback = callback || noop

    return pull(
      pull.map((node) => {
        return {
          block: new Block(node.serialize()),
          cid: node.cid()
        }
      }),
      this.bs.putStream(),
      pull.onEnd(callback)
    )
  }

  get (cid, callback) {
    pull(
      this.getStream(cid),
      pull.collect((err, res) => {
        if (err) {
          return callback(err)
        }
        callback(null, res[0])
      })
    )
  }

  getStream (cid) {
    return pull(
      this.bs.getStream(cid),
      pull.map((block) => {
        // TODO
        //   deserialize this block into the format described by the CID
        //   if the multicodec is not known (i.e we don't have a deserializer)
        //   send back the raw data

        // old -> ipld.unmarshal(block.data)
      })
    )
  }

  getRecursive (cid, callback) {
    pull(
      this.getRecursiveStream(cid),
      pull.collect(callback)
    )
  }

  getRecursiveStream (cid) {
    return pull(
      this.getStream(cid),
      pull.map((node) => {
        traverse.widthFirst(node, (node) => {
          return pull(
            pull.values(utils.getKeys(node)),
            pull.map((link) => this.getStream(link)),
            pull.flatten()
          )
        })
      }),
      pull.flatten()
    )
  }

  remove (cids, callback) {
    this.bs.delete(cids, callback)
  }
}

function noop () {}

/*
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
*/
