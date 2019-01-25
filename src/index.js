'use strict'

const Block = require('ipfs-block')
const pull = require('pull-stream')
const CID = require('cids')
const pullDeferSource = require('pull-defer').source
const pullTraverse = require('pull-traverse')
const map = require('async/map')
const waterfall = require('async/waterfall')
const mergeOptions = require('merge-options')
const ipldDagCbor = require('ipld-dag-cbor')
const ipldDagPb = require('ipld-dag-pb')
const ipldRaw = require('ipld-raw')
const multicodec = require('multicodec')
const { fancyIterator } = require('./util')

function noop () {}

class IPLDResolver {
  constructor (userOptions) {
    const options = mergeOptions(IPLDResolver.defaultOptions, userOptions)

    if (!options.blockService) {
      throw new Error('Missing blockservice')
    }
    this.bs = options.blockService

    // Object with current list of active resolvers
    this.resolvers = {}

    // API entry point
    this.support = {}

    // Adds support for an IPLD format
    this.support.add = (codec, resolver, util) => {
      if (this.resolvers[codec]) {
        const codecName = multicodec.print[codec]
        throw new Error(`Resolver already exists for codec "${codecName}"`)
      }

      this.resolvers[codec] = {
        resolver: resolver,
        util: util
      }
    }

    if (options.loadFormat === undefined) {
      this.support.load = async (codec) => {
        const codecName = multicodec.print[codec]
        throw new Error(`No resolver found for codec "${codecName}"`)
      }
    } else {
      this.support.load = options.loadFormat
    }

    this.support.rm = (codec) => {
      if (this.resolvers[codec]) {
        delete this.resolvers[codec]
      }
    }

    // Enable all supplied formats
    for (const format of options.formats) {
      const { resolver, util } = format
      // IPLD Formats are using strings instead of constants for the multicodec
      const codecBuffer = multicodec.getCodeVarint(resolver.multicodec)
      const codec = multicodec.getCode(codecBuffer)
      this.support.add(codec, resolver, util)
    }
  }

  /**
   * Retrieves IPLD Nodes along the `path` that is rooted at `cid`.
   *
   * @param {CID} cid - the CID the resolving starts.
   * @param {string} path - the path that should be resolved.
   * @returns {Iterable.<Promise.<{remainderPath: string, value}>>} - Returns an async iterator of all the IPLD Nodes that were traversed during the path resolving. Every element is an object with these fields:
   *   - `remainderPath`: the part of the path that wasn’t resolved yet.
   *   - `value`: the value where the resolved path points to. If further traversing is possible, then the value is a CID object linking to another IPLD Node. If it was possible to fully resolve the path, value is the value the path points to. So if you need the CID of the IPLD Node you’re currently at, just take the value of the previously returned IPLD Node.
   */
  resolve (cid, path) {
    if (!CID.isCID(cid)) {
      throw new Error('`cid` argument must be a CID')
    }
    if (typeof path !== 'string') {
      throw new Error('`path` argument must be a string')
    }

    const next = () => {
      // End iteration if there isn't a CID to follow anymore
      if (cid === null) {
        return Promise.resolve({ done: true })
      }

      return new Promise(async (resolve, reject) => {
        let format
        try {
          format = await this._getFormat(cid.codec)
        } catch (err) {
          return reject(err)
        }

        // get block
        // use local resolver
        // update path value
        this.bs.get(cid, (err, block) => {
          if (err) {
            return reject(err)
          }

          format.resolver.resolve(block.data, path, (err, result) => {
            if (err) {
              return reject(err)
            }

            // Prepare for the next iteration if there is a `remainderPath`
            path = result.remainderPath
            let value = result.value
            // NOTE vmx 2018-11-29: Not all IPLD Formats return links as
            // CIDs yet. Hence try to convert old style links to CIDs
            if (Object.keys(value).length === 1 && '/' in value) {
              value = new CID(value['/'])
            }
            if (CID.isCID(value)) {
              cid = value
            } else {
              cid = null
            }

            return resolve({
              done: false,
              value: {
                remainderPath: path,
                value
              }
            })
          })
        })
      })
    }

    return fancyIterator(next)
  }

  /**
   * Get multiple nodes back from an array of CIDs.
   *
   * @param {Array<CID>} cids
   * @param {function(Error, Array)} callback
   * @returns {void}
   */
  getMany (cids, callback) {
    if (!Array.isArray(cids)) {
      return callback(new Error('Argument must be an array of CIDs'))
    }
    this.bs.getMany(cids, (err, blocks) => {
      if (err) {
        return callback(err)
      }
      map(blocks, (block, mapCallback) => {
        // TODO vmx 2018-12-07: Make this one async/await once
        // `util.serialize()` is a Promise
        this._getFormat(block.cid.codec).then((format) => {
          format.util.deserialize(block.data, mapCallback)
        }).catch((err) => {
          mapCallback(err)
        })
      },
      callback)
    })
  }

  put (node, options, callback) {
    if (typeof options === 'function') {
      callback = options
      return setImmediate(() => callback(
        new Error('IPLDResolver.put requires options')
      ))
    }
    callback = callback || noop

    if (options.cid && CID.isCID(options.cid)) {
      if (options.onlyHash) {
        return setImmediate(() => callback(null, options.cid))
      }

      return this._put(options.cid, node, callback)
    }

    // TODO vmx 2018-12-07: Make this async/await once `put()` returns a
    // Promise
    this._getFormat(options.format).then((format) => {
      format.util.cid(node, options, (err, cid) => {
        if (err) {
          return callback(err)
        }

        if (options.onlyHash) {
          return callback(null, cid)
        }

        this._put(cid, node, callback)
      })
    }).catch((err) => {
      callback(err)
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

      waterfall([
        async () => {
          return this._getFormat(cid.codec)
        },
        (format, cb) => this.bs.get(cid, (err, block) => {
          if (err) return cb(err)
          cb(null, format, block)
        }),
        (format, block, cb) => format.resolver.tree(block.data, cb)
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

          waterfall([
            async () => {
              return this._getFormat(cid.codec)
            },
            (format, cb) => this.bs.get(cid, (err, block) => {
              if (err) return cb(err)
              cb(null, format, block)
            }),
            (format, block, cb) => format.resolver.tree(block.data, (err, paths) => {
              if (err) {
                return cb(err)
              }
              map(paths, (p, cb) => {
                format.resolver.isLink(block.data, p, (err, link) => {
                  if (err) {
                    return cb(err)
                  }
                  cb(null, { path: p, link: link })
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
                  cid: IPLDResolver._maybeCID(p.link)
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
  async _getFormat (codec) {
    // TODO vmx 2019-01-24: Once all CIDs support accessing the codec code
    // instead of the name, remove this part
    if (typeof codec === 'string') {
      const constantName = codec.toUpperCase().replace(/-/g, '_')
      codec = multicodec[constantName]
    }

    if (this.resolvers[codec]) {
      return this.resolvers[codec]
    }

    // If not supported, attempt to dynamically load this format
    const format = await this.support.load(codec)
    this.resolvers[codec] = format
    return format
  }

  _put (cid, node, callback) {
    callback = callback || noop

    waterfall([
      (cb) => {
        this._getFormat(cid.codec).then(
          (format) => cb(null, format),
          (error) => cb(error)
        )
      },
      (format, cb) => format.util.serialize(node, cb),
      (buf, cb) => this.bs.put(new Block(buf, cid), cb)
    ], (err) => {
      if (err) {
        return callback(err)
      }
      callback(null, cid)
    })
  }

  /**
   * Return a CID instance if it is a link.
   *
   * If something is a link `{"/": "baseencodedcid"}` or a CID, then return
   * a CID object, else return `null`.
   *
   * @param {*} link - The object to check
   * @returns {?CID} - A CID instance
   */
  static _maybeCID (link) {
    if (CID.isCID(link)) {
      return link
    }
    if (link && link['/'] !== undefined) {
      return new CID(link['/'])
    }
    return null
  }
}

/**
 * Default options for IPLD.
 */
IPLDResolver.defaultOptions = {
  formats: [ipldDagCbor, ipldDagPb, ipldRaw]
}

module.exports = IPLDResolver
