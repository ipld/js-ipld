'use strict'

const Block = require('ipfs-block')
const pull = require('pull-stream')
const CID = require('cids')
const until = require('async/until')
const IPFSRepo = require('ipfs-repo')
const MemoryStore = require('interface-pull-blob-store')
const BlockService = require('ipfs-block-service')

const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')

module.exports = class IPLDResolver {
  constructor (blockService) {
    // nicola will love this!
    if (!blockService) {
      const repo = new IPFSRepo('in-memory', { stores: MemoryStore })
      blockService = new BlockService(repo)
    }

    this.bs = blockService
    this.resolvers = {}

    this.support = {}

    // Adds support for an IPLD format
    this.support.add = (multicodec, resolver, util) => {
      if (this.resolvers[multicodec]) {
        throw new Error(multicodec + 'already supported')
      }

      this.resolvers[multicodec] = {
        resolver: resolver,
        util: util
      }
    }

    this.support.rm = (multicodec) => {
      if (this.resolvers[multicodec]) {
        delete this.resolvers[multicodec]
      }
    }

    // Support by default dag-pb and dag-cbor
    this.support.add(dagPB.resolver.multicodec, dagPB.resolver, dagPB.util)
    this.support.add(dagCBOR.resolver.multicodec, dagCBOR.resolver, dagCBOR.util)
  }

  resolve (cid, path, callback) {
    if (path === '/') {
      return this.get(cid, callback)
    }

    let value

    until(
      () => {
        if (!path || path === '' || path === '/') {
          return true
        } else {
          // continue traversing
          if (value) {
            cid = new CID(value['/'])
          }
          return false
        }
      },
      (cb) => {
        // get block
        // use local resolver
        // update path value
        this.bs.get(cid, (err, block) => {
          if (err) {
            return cb(err)
          }
          const r = this.resolvers[cid.codec]
          r.resolver.resolve(block, path, (err, result) => {
            if (err) {
              return cb(err)
            }
            value = result.value
            path = result.remainderPath
            cb()
          })
        })
      },
      (err, results) => {
        if (err) {
          return callback(err)
        }
        return callback(null, value)
      }
    )
  }

  // Node operations (get and retrieve nodes, not values)

  put (nodeAndCID, callback) {
    callback = callback || noop
    pull(
      pull.values([nodeAndCID]),
      this.putStream(callback)
    )
  }

  putStream (callback) {
    callback = callback || noop

    return pull(
      pull.asyncMap((nodeAndCID, cb) => {
        const cid = nodeAndCID.cid
        const r = this.resolvers[cid.codec]

        r.util.serialize(nodeAndCID.node, (err, serialized) => {
          if (err) {
            return cb(err)
          }
          cb(null, {
            block: new Block(serialized),
            cid: cid
          })
        })
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
      pull.asyncMap((block, cb) => {
        const r = this.resolvers[cid.codec]
        if (r) {
          r.util.deserialize(block.data, (err, deserialized) => {
            if (err) {
              return cb(err)
            }
            cb(null, deserialized)
          })
        } else { // multicodec unknown, send back raw data
          cb(null, block.data)
        }
      })
    )
  }

  remove (cids, callback) {
    this.bs.delete(cids, callback)
  }
}

function noop () {}
