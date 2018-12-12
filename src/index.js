'use strict'

const Block = require('ipfs-block')
const CID = require('cids')
const waterfall = require('async/waterfall')
const mergeOptions = require('merge-options')
const ipldDagCbor = require('ipld-dag-cbor')
const ipldDagPb = require('ipld-dag-pb')
const ipldRaw = require('ipld-raw')
const multicodec = require('multicodec')
const typical = require('typical')
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

    if (options.loadFormat === undefined) {
      this.loadFormat = async (codec) => {
        const codecName = multicodec.print[codec]
        throw new Error(`No resolver found for codec "${codecName}"`)
      }
    } else {
      this.loadFormat = options.loadFormat
    }

    // Enable all supplied formats
    for (const format of options.formats) {
      this.addFormat(format)
    }
  }

  /**
   * Add support for an IPLD Format.
   *
   * @param {Object} format - The implementation of an IPLD Format.
   * @returns {void}
   */
  addFormat (format) {
    // IPLD Formats are using strings instead of constants for the multicodec
    const codecBuffer = multicodec.getCodeVarint(format.resolver.multicodec)
    const codec = multicodec.getCode(codecBuffer)
    if (this.resolvers[codec]) {
      const codecName = multicodec.print[codec]
      throw new Error(`Resolver already exists for codec "${codecName}"`)
    }

    this.resolvers[codec] = {
      resolver: format.resolver,
      util: format.util
    }
  }

  /**
   * Remove support for an IPLD Format.
   *
   * @param {number} codec - The codec of the IPLD Format to remove.
   * @returns {void}
   */
  removeFormat (codec) {
    if (this.resolvers[codec]) {
      delete this.resolvers[codec]
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
   * @param {Iterable.<CID>} cids - The CIDs of the IPLD Nodes that should be retrieved.
   * @returns {Iterable.<Promise.<Object>>} - Returns an async iterator with the IPLD Nodes that correspond to the given `cids`.
   */
  get (cids) {
    if (!typical.isIterable(cids) || typical.isString(cids) ||
        Buffer.isBuffer(cids)) {
      throw new Error('`cids` must be an iterable of CIDs')
    }

    let blocks
    const next = () => {
      // End of iteration if there aren't any blocks left to return
      if (cids.length === 0 ||
        (blocks !== undefined && blocks.length === 0)
      ) {
        return Promise.resolve({ done: true })
      }

      return new Promise(async (resolve, reject) => {
        // Lazy load block.
        // Currntly the BlockService return all nodes as an array. In the
        // future this will also be an iterator
        if (blocks === undefined) {
          const cidsArray = Array.from(cids)
          this.bs.getMany(cidsArray, async (err, returnedBlocks) => {
            if (err) {
              return reject(err)
            }
            blocks = returnedBlocks
            const block = blocks.shift()
            try {
              const node = await this._deserialize(block)
              return resolve({ done: false, value: node })
            } catch (err) {
              return reject(err)
            }
          })
        } else {
          const block = blocks.shift()
          try {
            const node = await this._deserialize(block)
            return resolve({ done: false, value: node })
          } catch (err) {
            return reject(err)
          }
        }
      })
    }

    return fancyIterator(next)
  }

  /**
   * Stores the given IPLD Nodes of a recognized IPLD Format.
   *
   * @param {Iterable.<Object>} nodes - Deserialized IPLD nodes that should be inserted.
   * @param {number} format - The multicodec of the format that IPLD Node should be encoded in.
   * @param {Object} [userOptions] -  Options are applied to any of the `nodes` and is an object with the following properties.
   * @param {number} [userOtions.hashAlg=hash algorithm of the given multicodec] - The hashing algorithm that is used to calculate the CID.
   * @param {number} [userOptions.cidVersion=1]`- The CID version to use.
   * @param {boolean} [userOptions.onlyHash=false] - If true the serialized form of the IPLD Node will not be passed to the underlying block store.
   * @returns {Iterable.<Promise.<CID>>} - Returns an async iterator with the CIDs of the serialized IPLD Nodes.
   */
  put (nodes, format, userOptions) {
    if (!typical.isIterable(nodes) || typical.isString(nodes) ||
        Buffer.isBuffer(nodes)) {
      throw new Error('`nodes` must be an iterable')
    }
    if (format === undefined) {
      throw new Error('`put` requires a format')
    }
    if (typeof format !== 'number') {
      throw new Error('`format` parameter must be number (multicodec)')
    }

    let options
    let formatImpl

    const next = () => {
      // End iteration if there are no more nodes to put
      if (nodes.length === 0) {
        return Promise.resolve({ done: true })
      }

      return new Promise(async (resolve, reject) => {
        // Lazy load the options not when the iterator is initialized, but
        // when we hit the first iteration. This way the constructor can be
        // a synchronous function.
        if (options === undefined) {
          try {
            formatImpl = await this._getFormat(format)
          } catch (err) {
            return reject(err)
          }
          const defaultOptions = {
            hashAlg: formatImpl.defaultHashAlg,
            cidVersion: 1,
            onlyHash: false
          }
          options = mergeOptions(defaultOptions, userOptions)
        }

        const node = nodes.shift()
        const cidOptions = {
          version: options.cidVersion,
          hashAlg: options.hashAlg,
          onlyHash: options.onlyHash
        }
        formatImpl.util.cid(node, cidOptions, (err, cid) => {
          if (err) {
            return reject(err)
          }

          if (options.onlyHash) {
            return resolve({ done: false, value: cid })
          }

          this._put(cid, node, (err, cid) => {
            if (err) {
              return reject(err)
            }
            return resolve({ done: false, value: cid })
          })
        })
      })
    }

    return fancyIterator(next)
  }

  /**
   * Remove IPLD Nodes by the given CIDs.
   *
   * Throws an error if any of the Blocks can’t be removed. This operation is
   * *not* atomic, some Blocks might have already been removed.
   *
   * @param {Iterable.<CID>} cids - The CIDs of the IPLD Nodes that should be removed
   * @return {void}
   */
  remove (cids) {
    if (!typical.isIterable(cids) || typical.isString(cids) ||
        Buffer.isBuffer(cids)) {
      throw new Error('`cids` must be an iterable of CIDs')
    }

    const next = () => {
      // End iteration if there are no more nodes to remove
      if (cids.length === 0) {
        return Promise.resolve({ done: true })
      }

      return new Promise((resolve, reject) => {
        const cid = cids.shift()
        this.bs.delete(cid, (err) => {
          if (err) {
            return reject(err)
          }
          return resolve({ done: false, value: cid })
        })
      })
    }

    return fancyIterator(next)
  }

  /**
   * Returns all the paths that can be resolved into.
   *
   * @param {Object} cid - The ID to get the paths from
   * @param {string} [offsetPath=''] - the path to start to retrieve the other paths from.
   * @param {Object} [userOptions]
   * @param {number} [userOptions.recursive=false] - whether to get the paths recursively or not. `false` resolves only the paths of the given CID.
   * @returns {Iterable.<Promise.<String>>} - Returns an async iterator with paths that can be resolved into
   */
  tree (cid, offsetPath, userOptions) {
    if (typeof offsetPath === 'object') {
      userOptions = offsetPath
      offsetPath = undefined
    }
    offsetPath = offsetPath || ''

    const defaultOptions = {
      recursive: false
    }
    const options = mergeOptions(defaultOptions, userOptions)

    // Get available paths from a block
    const getPaths = (cid) => {
      return new Promise(async (resolve, reject) => {
        let format
        try {
          format = await this._getFormat(cid.codec)
        } catch (error) {
          return reject(error)
        }
        this.bs.get(cid, (err, block) => {
          if (err) {
            return reject(err)
          }
          format.resolver.tree(block.data, (err, paths) => {
            if (err) {
              return reject(err)
            }
            return resolve({ paths, block })
          })
        })
      })
    }

    // If a path is a link then follow it and return its CID
    const maybeRecurse = (block, treePath) => {
      return new Promise(async (resolve, reject) => {
        // A treepath we might want to follow recursively
        const format = await this._getFormat(block.cid.codec)
        format.resolver.isLink(block.data, treePath, (err, link) => {
          if (err) {
            return reject(err)
          }
          // Something to follow recusively, hence push it into the queue
          if (link) {
            const cid = IPLDResolver._maybeCID(link)
            resolve(cid)
          } else {
            resolve(null)
          }
        })
      })
    }

    // The list of paths that will get returned
    let treePaths = []
    // The current block, needed to call `isLink()` on every interation
    let block
    // The list of items we want to follow recursively. The items are
    // an object consisting of the CID and the currently already resolved
    // path
    const queue = [{ cid, basePath: '' }]
    // The path that was already traversed
    let basePath

    const next = () => {
      // End of iteration if there aren't any paths left to return or
      // if we don't want to traverse recursively and have already
      // returne the first level
      if (treePaths.length === 0 && queue.length === 0) {
        return { done: true }
      }

      return new Promise(async (resolve, reject) => {
        // There aren't any paths left, get them from the given CID
        if (treePaths.length === 0 && queue.length > 0) {
          ({ cid, basePath } = queue.shift())

          let paths
          try {
            ({ block, paths } = await getPaths(cid))
          } catch (error) {
            return reject(error)
          }
          treePaths.push(...paths)
        }
        const treePath = treePaths.shift()
        let fullPath = basePath + treePath

        // Only follow links if recursion is intended
        if (options.recursive) {
          cid = await maybeRecurse(block, treePath)
          if (cid !== null) {
            queue.push({ cid, basePath: fullPath + '/' })
          }
        }

        // Return it if it matches the given offset path, but is not the
        // offset path itself
        if (fullPath.startsWith(offsetPath) &&
            fullPath.length > offsetPath.length) {
          if (offsetPath.length > 0) {
            fullPath = fullPath.slice(offsetPath.length + 1)
          }
          return resolve({ done: false, value: fullPath })
        } else { // Else move on to the next iteration before returning
          return resolve(next())
        }
      })
    }

    return fancyIterator(next)
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
    const format = await this.loadFormat(codec)
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
   * Deserialize a given block
   *
   * @param {Object} block - The block to deserialize
   * @return {Object} = Returns the deserialized node
   */
  async _deserialize (block) {
    return new Promise((resolve, reject) => {
      this._getFormat(block.cid.codec).then((format) => {
        // TODO vmx 2018-12-11: Make this one async/await once
        // `util.serialize()` is a Promise
        format.util.deserialize(block.data, (err, deserialized) => {
          if (err) {
            return reject(err)
          }
          return resolve(deserialized)
        })
      }).catch((err) => {
        return reject(err)
      })
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
