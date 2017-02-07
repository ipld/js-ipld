'use strict'

const Block = require('ipfs-block')
const pull = require('pull-stream')
const CID = require('cids')
const until = require('async/until')
const IPFSRepo = require('ipfs-repo')
const MemoryStore = require('interface-pull-blob-store')
const BlockService = require('ipfs-block-service')
const joinPath = require('path').join

const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')
const ipldEthBlock = require('ipld-eth-block')

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

    // Support by default dag-pb, dag-cbor, and eth-block
    this.support.add(dagPB.resolver.multicodec,
                     dagPB.resolver,
                     dagPB.util)

    this.support.add(dagCBOR.resolver.multicodec,
                     dagCBOR.resolver,
                     dagCBOR.util)

    this.support.add(ipldEthBlock.resolver.multicodec,
                     ipldEthBlock.resolver,
                     ipldEthBlock.util)
  }

  get (cid, path, callback) {
    if (typeof path === 'function') {
      callback = path
      path = undefined
    }

    // this removes occurrences of ./, //, ../
    // makes sure that path never starts with ./ or /
    if (typeof path === 'string') {
      path = joinPath('/', path).substr(1)
    }

    if (path === '' || !path) {
      return this._get(cid, callback)
    }

    let value

    until(
      () => {
        const endReached = !path || path === '' || path === '/'
        const isTerminal = value && !value['/']

        if (endReached && isTerminal) {
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

  put (node, cidOrFormat, hashAlg, callback) {
    let nodeAndCID

    if (CID.isCID(cidOrFormat)) {
      nodeAndCID = {
        node: node,
        cid: cidOrFormat
      }

      callback = hashAlg
      hashAlg = undefined

      store.apply(this)
    } else {
      if (typeof hashAlg === 'function') {
        callback = hashAlg
        hashAlg = undefined
      }

      const format = cidOrFormat
      hashAlg = hashAlg || 'sha2-256'

      const r = this.resolvers[format]
      // TODO add support for different hash funcs in the utils of
      // each format (just really needed for CBOR for now, really
      // r.util.cid(node1, hashAlg, (err, cid) => {
      r.util.cid(node, (err, cid) => {
        if (err) {
          return callback(err)
        }

        nodeAndCID = {
          node: node,
          cid: cid
        }

        store.apply(this)
      })
    }

    function store () {
      callback = callback || noop

      pull(
        pull.values([nodeAndCID]),
        this._putStream(callback)
      )
    }
  }

  remove (cids, callback) {
    this.bs.delete(cids, callback)
  }

  /* internals */

  _get (cid, callback) {
    pull(
      this._getStream(cid),
      pull.collect((err, res) => {
        if (err) {
          return callback(err)
        }
        callback(null, res[0])
      })
    )
  }

  _getStream (cid) {
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

  _putStream (callback) {
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
}

function noop () {}
