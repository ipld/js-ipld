'use strict'

const Block = require('ipfs-block')
const CID = require('cids')
const mergeOptions = require('merge-options')
const ipldDagCbor = require('ipld-dag-cbor')
const ipldDagPb = require('ipld-dag-pb')
const ipldRaw = require('ipld-raw')
const multicodec = require('multicodec')
const typical = require('typical')
const { extendIterator } = require('./util')

class IPLDResolver {
  constructor (userOptions) {
    const options = mergeOptions(IPLDResolver.defaultOptions, userOptions)

    if (!options.blockService) {
      throw new Error('Missing blockservice')
    }
    this.bs = options.blockService

    // Object with current list of active resolvers
    this.resolvers = {}

    if (typeof options.loadFormat !== 'function') {
      this.loadFormat = (codec) => {
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
   * @returns {this}
   */
  addFormat (format) {
    const codec = format.codec
    if (this.resolvers[format.format]) {
      const codecName = multicodec.print[codec]
      throw new Error(`Resolver already exists for codec "${codecName}"`)
    }

    this.resolvers[codec] = format

    return this
  }

  /**
   * Remove support for an IPLD Format.
   *
   * @param {number} codec - The codec of the IPLD Format to remove.
   * @returns {this}
   */
  removeFormat (codec) {
    if (this.resolvers[codec]) {
      delete this.resolvers[codec]
    }

    return this
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

    const generator = async function * () {
      // End iteration if there isn't a CID to follow anymore
      while (cid !== null) {
        const format = await this._getFormat(cid.codec)

        // get block
        // use local resolver
        // update path value
        const block = await this.bs.get(cid)
        const result = format.resolver.resolve(block.data, path)

        // Prepare for the next iteration if there is a `remainderPath`
        path = result.remainderPath
        let value = result.value
        // NOTE vmx 2018-11-29: Not all IPLD Formats return links as
        // CIDs yet. Hence try to convert old style links to CIDs
        if (Object.keys(value).length === 1 && '/' in value) {
          try {
            value = new CID(value['/'])
          } catch (_error) {
            value = null
          }
        }
        cid = CID.isCID(value) ? value : null

        yield {
          remainderPath: path,
          value
        }
      }
    }.bind(this)

    return extendIterator(generator())
  }

  /**
   * Get a node by CID.
   *
   * @param {CID} cid - The CID of the IPLD Node that should be retrieved.
   * @returns {Promise.<Object>} - Returns a Promise with the IPLD Node that correspond to the given `cid`.
   */
  async get (cid) {
    const block = await this.bs.get(cid)
    const format = await this._getFormat(block.cid.codec)
    const node = format.util.deserialize(block.data)

    return node
  }

  /**
   * Get multiple nodes back from an array of CIDs.
   *
   * @param {Iterable.<CID>} cids - The CIDs of the IPLD Nodes that should be retrieved.
   * @returns {Iterable.<Promise.<Object>>} - Returns an async iterator with the IPLD Nodes that correspond to the given `cids`.
   */
  getMany (cids) {
    if (!typical.isIterable(cids) || typeof cids === 'string' ||
        Buffer.isBuffer(cids)) {
      throw new Error('`cids` must be an iterable of CIDs')
    }

    const generator = async function * () {
      for await (const cid of cids) {
        yield this.get(cid)
      }
    }.bind(this)

    return extendIterator(generator())
  }

  /**
   * Stores the given IPLD Node of a recognized IPLD Format.
   *
   * @param {Object} node - The deserialized IPLD node that should be inserted.
   * @param {number} format - The multicodec of the format that IPLD Node should be encoded in.
   * @param {Object} [userOptions] -  Options is an object with the following properties.
   * @param {number} [userOtions.hashAlg=hash algorithm of the given multicodec] - The hashing algorithm that is used to calculate the CID.
   * @param {number} [userOptions.cidVersion=1] - The CID version to use.
   * @param {boolean} [userOptions.onlyHash=false] - If true the serialized form of the IPLD Node will not be passed to the underlying block store.
   * @returns {Promise.<CID>} - Returns the CID of the serialized IPLD Nodes.
   */
  async put (node, format, userOptions) {
    if (format === undefined) {
      throw new Error('`put` requires a format')
    }
    if (typeof format !== 'number') {
      throw new Error('`format` parameter must be number (multicodec)')
    }

    const formatImpl = await this._getFormat(format)
    const defaultOptions = {
      hashAlg: formatImpl.defaultHashAlg,
      cidVersion: 1,
      onlyHash: false
    }
    const options = mergeOptions(defaultOptions, userOptions)

    const cidOptions = {
      cidVersion: options.cidVersion,
      hashAlg: options.hashAlg,
      onlyHash: options.onlyHash
    }
    const serialized = formatImpl.util.serialize(node)
    const cid = await formatImpl.util.cid(serialized, cidOptions)

    if (!options.onlyHash) {
      const block = new Block(serialized, cid)
      await this.bs.put(block)
    }

    return cid
  }

  /**
   * Stores the given IPLD Nodes of a recognized IPLD Format.
   *
   * @param {Iterable.<Object>} nodes - Deserialized IPLD nodes that should be inserted.
   * @param {number} format - The multicodec of the format that IPLD Node should be encoded in.
   * @param {Object} [userOptions] -  Options are applied to any of the `nodes` and is an object with the following properties.
   * @param {number} [userOtions.hashAlg=hash algorithm of the given multicodec] - The hashing algorithm that is used to calculate the CID.
   * @param {number} [userOptions.cidVersion=1] - The CID version to use.
   * @param {boolean} [userOptions.onlyHash=false] - If true the serialized form of the IPLD Node will not be passed to the underlying block store.
   * @returns {Iterable.<Promise.<CID>>} - Returns an async iterator with the CIDs of the serialized IPLD Nodes.
   */
  putMany (nodes, format, userOptions) {
    if (!typical.isIterable(nodes) || typeof nodes === 'string' ||
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

    const generator = async function * () {
      for await (const node of nodes) {
        // Lazy load the options not when the iterator is initialized, but
        // when we hit the first iteration. This way the constructor can be
        // a synchronous function.
        if (options === undefined) {
          formatImpl = await this._getFormat(format)
          const defaultOptions = {
            hashAlg: formatImpl.defaultHashAlg,
            cidVersion: 1,
            onlyHash: false
          }
          options = mergeOptions(defaultOptions, userOptions)
        }

        yield this.put(node, format, options)
      }
    }.bind(this)

    return extendIterator(generator())
  }

  /**
   * Remove an IPLD Node by the given CID.
   *
   * @param {CID} cid - The CID of the IPLD Node that should be removed.
   * @return {Promise.<CID>} The CID of the removed IPLD Node.
   */
  async remove (cid) { // eslint-disable-line require-await
    return this.bs.delete(cid)
  }

  /**
   * Remove IPLD Nodes by the given CIDs.
   *
   * Throws an error if any of the Blocks can’t be removed. This operation is
   * *not* atomic, some Blocks might have already been removed.
   *
   * @param {Iterable.<CID>} cids - The CIDs of the IPLD Nodes that should be removed.
   * @return {Iterable.<Promise.<CID>>} Returns an async iterator with the CIDs of the removed IPLD Nodes.
   */
  removeMany (cids) {
    if (!typical.isIterable(cids) || typeof cids === 'string' ||
        Buffer.isBuffer(cids)) {
      throw new Error('`cids` must be an iterable of CIDs')
    }

    const generator = async function * () {
      for await (const cid of cids) {
        yield this.remove(cid)
      }
    }.bind(this)

    return extendIterator(generator())
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

    // If a path is a link then follow it and return its CID
    const maybeRecurse = async (block, treePath) => {
      // A treepath we might want to follow recursively
      const format = await this._getFormat(block.cid.codec)
      const result = format.resolver.resolve(block.data, treePath)
      // Something to follow recusively, hence push it into the queue
      if (CID.isCID(result.value)) {
        return result.value
      } else {
        return null
      }
    }

    const generator = async function * () {
      // The list of paths that will get returned
      const treePaths = []
      // The current block, needed to call `isLink()` on every interation
      let block
      // The list of items we want to follow recursively. The items are
      // an object consisting of the CID and the currently already resolved
      // path
      const queue = [{ cid, basePath: '' }]
      // The path that was already traversed
      let basePath

      // End of iteration if there aren't any paths left to return or
      // if we don't want to traverse recursively and have already
      // returne the first level
      while (treePaths.length > 0 || queue.length > 0) {
        // There aren't any paths left, get them from the given CID
        if (treePaths.length === 0 && queue.length > 0) {
          ({ cid, basePath } = queue.shift())
          const format = await this._getFormat(cid.codec)
          block = await this.bs.get(cid)

          const paths = format.resolver.tree(block.data)
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

          yield fullPath
        }
      }
    }.bind(this)

    return extendIterator(generator())
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
    this.addFormat(format)
    return format
  }
}

/**
 * Default options for IPLD.
 */
IPLDResolver.defaultOptions = {
  formats: [ipldDagCbor, ipldDagPb, ipldRaw]
}

module.exports = IPLDResolver
