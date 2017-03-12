'use strict'

const Block = require('ipfs-block')
const pull = require('pull-stream')
const pullPushable = require('pull-pushable')
const CID = require('cids')
const doUntil = require('async/doUntil')
const IPFSRepo = require('ipfs-repo')
const MemoryStore = require('interface-pull-blob-store')
const BlockService = require('ipfs-block-service')
const joinPath = require('path').join
const pullDeferSource = require('pull-defer').source
const pullTraverse = require('pull-traverse')
const asyncEach = require('async/each')
const pullSort = require('pull-sort')

const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')
const ipldEthBlock = require('ipld-eth-block')
const ipldEthBlockList = require('ipld-eth-block-list')
const ipldEthTxTrie = require('ipld-eth-tx-trie')
const ipldEthStateTrie = require('ipld-eth-state-trie')
const ipldEthStorageTrie = require('ipld-eth-storage-trie')

function noop () {}

class IPLDResolver {
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

    // Support by default dag-pb, dag-cbor, and eth-*
    this.support.add(dagPB.resolver.multicodec,
                     dagPB.resolver,
                     dagPB.util)

    this.support.add(dagCBOR.resolver.multicodec,
                     dagCBOR.resolver,
                     dagCBOR.util)

    this.support.add(ipldEthBlock.resolver.multicodec,
                     ipldEthBlock.resolver,
                     ipldEthBlock.util)

    this.support.add(ipldEthBlockList.resolver.multicodec,
                     ipldEthBlockList.resolver,
                     ipldEthBlockList.util)

    this.support.add(ipldEthTxTrie.resolver.multicodec,
                     ipldEthTxTrie.resolver,
                     ipldEthTxTrie.util)

    this.support.add(ipldEthStateTrie.resolver.multicodec,
                     ipldEthStateTrie.resolver,
                     ipldEthStateTrie.util)

    this.support.add(ipldEthStorageTrie.resolver.multicodec,
                     ipldEthStorageTrie.resolver,
                     ipldEthStorageTrie.util)
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
    if (typeof path === 'string') {
      path = joinPath('/', path).substr(1)
    }

    if (path === '' || !path) {
      return this._get(cid, (err, node) => {
        if (err) {
          return callback(err)
        }
        callback(null, {
          value: node,
          path: ''
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
          path: path
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

    let nodeAndCID

    if (options.cid && CID.isCID(options.cid)) {
      nodeAndCID = {
        node: node,
        cid: options.cid
      }

      store.apply(this)
    } else {
      options.hashAlg = options.hashAlg || 'sha2-256'

      const r = this.resolvers[options.format]
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
        this._putStream((err) => {
          if (err) {
            return callback(err)
          }
          callback(null, nodeAndCID.cid)
        })
      )
    }
  }

  treeStream (cid, path, options) {
    if (typeof path === 'object') {
      options = path
      path = undefined
    }

    options = options || {}

    // non recursive
    const p = pullPushable()

    if (!options.recursive) {
      const r = this.resolvers[cid.codec]

      this.bs.get(cid, (err, block) => {
        if (err) {
          return p(err)
        }

        r.resolver.tree(block, (err, paths) => {
          if (err) {
            return p(err)
          }
          paths.forEach((path) => p.push(path))
          p.end()
        })
      })
    }

    // recursive
    if (options.recursive) {
      pull(
        pullTraverse.widthFirst({ basePath: null, cid: cid }, (el) => {
          // pass the paths through the pushable pull stream
          // continue traversing the graph by returning
          // the next cids with deferred

          const deferred = pullDeferSource()

          this.bs.get(el.cid, (err, block) => {
            if (err) {
              return p(err)
            }

            const r = this.resolvers[el.cid.codec]

            r.resolver.tree(block, (err, paths) => {
              if (err) {
                p(err)
                return deferred.resolve(pull.empty())
              }

              const next = []

              asyncEach(paths, (path, cb) => {
                r.resolver.isLink(block, path, (err, link) => {
                  if (err) {
                    return cb(err)
                  }

                  p.push(el.basePath
                    ? el.basePath + '/' + path
                    : path
                  )

                  // if it is a link, continue traversing
                  if (link) {
                    next.push({
                      basePath: el.basePath
                        ? el.basePath + '/' + path
                        : path,
                      cid: new CID(link['/'])
                    })
                  }
                  cb()
                })
              }, (err) => {
                if (err) {
                  p(err)
                  return deferred.resolve(pull.empty())
                }

                deferred.resolve(pull.values(next))
              })
            })
          })

          return deferred
        }),
        pull.onEnd(() => p.end())
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
        pull.filter((el) => el && el.length > 0),
        pullSort((a, b) => a.localeCompare(b))
      )
    }

    return pull(
      p,
      pullSort((a, b) => a.localeCompare(b))
    )
  }

  remove (cids, callback) {
    this.bs.delete(cids, callback)
  }

  /*           */
  /* internals */
  /*           */

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

module.exports = IPLDResolver
