'use strict'

const Block = require('ipfs-block')
const pull = require('pull-stream')
const CID = require('cids')
const doUntil = require('async/doUntil')
const IPFSRepo = require('ipfs-repo')
const BlockService = require('ipfs-block-service')
const joinPath = require('path').join
const osPathSep = require('path').sep
const pullDeferSource = require('pull-defer').source
const pullTraverse = require('pull-traverse')
const map = require('async/map')
const series = require('async/series')
const waterfall = require('async/waterfall')
const MemoryStore = require('interface-datastore').MemoryDatastore

const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')
const ipldGit = require('ipld-git')
const ipldEthAccountSnapshot = require('ipld-ethereum').ethAccountSnapshot
const ipldEthBlock = require('ipld-ethereum').ethBlock
const ipldEthBlockList = require('ipld-ethereum').ethBlockList
const ipldEthStateTrie = require('ipld-ethereum').ethStateTrie
const ipldEthStorageTrie = require('ipld-ethereum').ethStorageTrie
const ipldEthTx = require('ipld-ethereum').ethTx
const ipldEthTxTrie = require('ipld-ethereum').ethTxTrie
const ipldRaw = require('ipld-raw')

function noop () {}

class IPLDResolver {
  constructor (blockService) {
    if (!blockService) {
      throw new Error('Missing blockservice')
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

    // Support by default dag-pb, dag-cbor, git, and eth-*
    this.support.add(dagPB.resolver.multicodec,
      dagPB.resolver,
      dagPB.util)

    this.support.add(dagCBOR.resolver.multicodec,
      dagCBOR.resolver,
      dagCBOR.util)

    this.support.add(ipldGit.resolver.multicodec,
      ipldGit.resolver,
      ipldGit.util)

    this.support.add(ipldEthAccountSnapshot.resolver.multicodec,
      ipldEthAccountSnapshot.resolver,
      ipldEthAccountSnapshot.util)

    this.support.add(ipldEthBlock.resolver.multicodec,
      ipldEthBlock.resolver,
      ipldEthBlock.util)

    this.support.add(ipldEthBlockList.resolver.multicodec,
      ipldEthBlockList.resolver,
      ipldEthBlockList.util)

    this.support.add(ipldEthStateTrie.resolver.multicodec,
      ipldEthStateTrie.resolver,
      ipldEthStateTrie.util)

    this.support.add(ipldEthStorageTrie.resolver.multicodec,
      ipldEthStorageTrie.resolver,
      ipldEthStorageTrie.util)

    this.support.add(ipldEthTx.resolver.multicodec,
      ipldEthTx.resolver,
      ipldEthTx.util)

    this.support.add(ipldEthTxTrie.resolver.multicodec,
      ipldEthTxTrie.resolver,
      ipldEthTxTrie.util)

    this.support.add(ipldRaw.resolver.multicodec,
      ipldRaw.resolver,
      ipldRaw.util)
  }

  get (cid, path, options, callback) {
    if (typeof path === 'function') {
      callback = path
      path = undefined
    }

    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    // this removes occurrences of ./, //, ../
    // makes sure that path never starts with ./ or /
    // path.join is OS specific. Need to convert back to POSIX format.
    if (typeof path === 'string') {
      path = joinPath('/', path)
        .substr(1)
        .split(osPathSep)
        .join('/')
    }

    if (path === '' || !path) {
      return this._get(cid, (err, node) => {
        if (err) {
          return callback(err)
        }
        callback(null, {
          value: node,
          remainderPath: ''
        })
      })
    }

    let value

    doUntil(
      (cb) => {
        // get block
        // use local resolver
        // update path value
        this.bs.get(cid, (err, block) => {
          if (err) {
            return cb(err)
          }
          const r = this.resolvers[cid.codec]
          if (!r) {
            return cb(new Error('No resolver found for codec "' + cid.codec + '"'))
          }
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
      () => {
        const endReached = !path || path === '' || path === '/'
        const isTerminal = value && !value['/']

        if ((endReached && isTerminal) || options.localResolve) {
          return true
        } else {
          // continue traversing
          if (value) {
            cid = new CID(value['/'])
          }
          return false
        }
      },
      (err, results) => {
        if (err) {
          return callback(err)
        }
        return callback(null, {
          value: value,
          remainderPath: path
        })
      }
    )
  }

  getStream (cid, path, options) {
    const deferred = pullDeferSource()

    this.get(cid, path, options, (err, result) => {
      if (err) {
        return deferred.resolve(
          pull.error(err)
        )
      }
      deferred.resolve(
        pull.values([result])
      )
    })

    return deferred
  }

  put (node, options, callback) {
    if (typeof options === 'function') {
      return setImmediate(() => callback(new Error('no options were passed')))
    }
    callback = callback || noop

    if (options.cid && CID.isCID(options.cid)) {
      return this._put(options.cid, node, callback)
    }

    options.hashAlg = options.hashAlg || 'sha2-256'
    const r = this.resolvers[options.format]
    if (!r) {
      return callback(new Error('No resolver found for codec "' + options.format + '"'))
    }
    // TODO add support for different hash funcs in the utils of
    // each format (just really needed for CBOR for now, really
    // r.util.cid(node1, hashAlg, (err, cid) => {
    r.util.cid(node, (err, cid) => {
      if (err) {
        return callback(err)
      }

      this._put(cid, node, callback)
    })
  }

  treeStream (cid, path, options) {
    if (typeof path === 'object') {
      options = path
      path = undefined
    }

    options = options || {}

    let p

    if (!options.recursive) {
      p = pullDeferSource()
      const r = this.resolvers[cid.codec]
      if (!r) {
        p.abort(new Error('No resolver found for codec "' + cid.codec + '"'))
        return p
      }

      waterfall([
        (cb) => this.bs.get(cid, cb),
        (block, cb) => r.resolver.tree(block, cb)
      ], (err, paths) => {
        if (err) {
          p.abort(err)
          return p
        }
        p.resolve(pull.values(paths))
      })
    }

    // recursive
    if (options.recursive) {
      p = pull(
        pullTraverse.widthFirst({
          basePath: null,
          cid: cid
        }, (el) => {
          // pass the paths through the pushable pull stream
          // continue traversing the graph by returning
          // the next cids with deferred

          if (typeof el === 'string') {
            return pull.empty()
          }

          const deferred = pullDeferSource()
          const cid = el.cid
          const r = this.resolvers[cid.codec]
          if (!r) {
            deferred.abort(new Error('No resolver found for codec "' + cid.codec + '"'))
            return deferred
          }

          waterfall([
            (cb) => this.bs.get(el.cid, cb),
            (block, cb) => r.resolver.tree(block, (err, paths) => {
              if (err) {
                return cb(err)
              }
              map(paths, (p, cb) => {
                r.resolver.isLink(block, p, (err, link) => {
                  if (err) {
                    return cb(err)
                  }
                  cb(null, {path: p, link: link})
                })
              }, cb)
            })
          ], (err, paths) => {
            if (err) {
              deferred.abort(err)
              return deferred
            }

            deferred.resolve(pull.values(paths.map((p) => {
              const base = el.basePath ? el.basePath + '/' + p.path : p.path
              if (p.link) {
                return {
                  basePath: base,
                  cid: new CID(p.link['/'])
                }
              }
              return base
            })))
          })
          return deferred
        }),
        pull.map((e) => {
          if (typeof e === 'string') {
            return e
          }
          return e.basePath
        }),
        pull.filter(Boolean)
      )
    }

    // filter out by path
    if (path) {
      return pull(
        p,
        pull.map((el) => {
          if (el.indexOf(path) === 0) {
            el = el.slice(path.length + 1)
            return el
          }
        }),
        pull.filter(Boolean)
      )
    }

    return p
  }

  remove (cids, callback) {
    this.bs.delete(cids, callback)
  }

  /*           */
  /* internals */
  /*           */

  _get (cid, callback) {
    const r = this.resolvers[cid.codec]
    if (!r) {
      return callback(new Error('No resolver found for codec "' + cid.codec + '"'))
    }

    waterfall([
      (cb) => this.bs.get(cid, cb),
      (block, cb) => {
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
      }
    ], callback)
  }

  _put (cid, node, callback) {
    callback = callback || noop

    const r = this.resolvers[cid.codec]
    if (!r) {
      return callback(new Error('No resolver found for codec "' + cid.codec + '"'))
    }

    waterfall([
      (cb) => r.util.serialize(node, cb),
      (buf, cb) => this.bs.put(new Block(buf, cid), cb)
    ], (err) => {
      if (err) {
        return callback(err)
      }
      callback(null, cid)
    })
  }
}

/**
 * Create an IPLD resolver with an inmemory blockservice and
 * repo.
 *
 * @param {function(Error, IPLDResolver)} callback
 * @returns {void}
 */
IPLDResolver.inMemory = function (callback) {
  const repo = new IPFSRepo('in-memory', {
    storageBackends: {
      root: MemoryStore,
      blocks: MemoryStore,
      datastore: MemoryStore
    },
    lock: 'memory'
  })
  const blockService = new BlockService(repo)

  series([
    (cb) => repo.init({}, cb),
    (cb) => repo.open(cb)
  ], (err) => {
    if (err) {
      return callback(err)
    }
    callback(null, new IPLDResolver(blockService))
  })
}

module.exports = IPLDResolver
