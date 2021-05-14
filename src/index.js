'use strict'

const Block = require('ipld-block')
const CID = require('cids')
const mergeOptions = require('merge-options')
const ipldDagCbor = require('ipld-dag-cbor')
const ipldDagPb = require('ipld-dag-pb')
const ipldRaw = require('ipld-raw')
const multicodec = require('multicodec')
// @ts-ignore no types
const typical = require('typical')
const { extendIterator } = require('./util')

/**
 * @typedef {import('interface-ipld-format').Format<object>} IPLDFormat
 * @typedef {import('multicodec').CodecCode} CodecCode
 * @typedef {import('./types').LoadFormatFn} LoadFormatFn
 * @typedef {import('./types').Options} Options
 * @typedef {import('./types').PutOptions} PutOptions
 * @typedef {import('./types').GetOptions} GetOptions
 * @typedef {import('./types').ResolveOptions} ResolveOptions
 * @typedef {import('./types').RemoveOptions} RemoveOptions
 * @typedef {import('./types').TreeOptions} TreeOptions
 */

class IPLDResolver {
  /**
   * @param {Options} userOptions
   */
  constructor (userOptions) {
    const options = mergeOptions(IPLDResolver.defaultOptions, userOptions)

    if (!options.blockService) {
      throw new Error('Missing blockservice')
    }
    this.bs = options.blockService

    // Object with current list of active resolvers
    /** @type {{ [key: number]: IPLDFormat}} */
    this.resolvers = {}

    if (typeof options.loadFormat !== 'function') {
      /**
       * @type {LoadFormatFn}
       */
      this.loadFormat = (codec) => {
        const codecName = multicodec.getNameFromCode(codec)
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
   * @param {IPLDFormat} format - The implementation of an IPLD Format.
   */
  addFormat (format) {
    const codec = format.codec

    if (this.resolvers[format.codec]) {
      const codecName = multicodec.getNameFromCode(codec)
      throw new Error(`Resolver already exists for codec "${codecName}"`)
    }

    this.resolvers[codec] = format

    return this
  }

  /**
   * Remove support for an IPLD Format.
   *
   * @param {multicodec.CodecCode} codec - The codec of the IPLD Format to remove.
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
   * @param {ResolveOptions} [options]
   */
  resolve (cid, path, options) {
    if (!CID.isCID(cid)) {
      throw new Error('`cid` argument must be a CID')
    }
    if (typeof path !== 'string') {
      throw new Error('`path` argument must be a string')
    }

    const ipld = this

    const generator = async function * () {
      // End iteration if there isn't a CID to follow any more
      while (true) {
        const format = await ipld.getFormat(multicodec.getCodeFromName(cid.codec))

        // get block
        // use local resolver
        // update path value
        const block = await ipld.bs.get(cid, options)
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

        yield {
          remainderPath: path,
          value
        }

        if (CID.isCID(value)) {
          cid = value
        } else {
          return
        }
      }
    }

    return extendIterator(generator())
  }

  /**
   * Get a node by CID.
   *
   * @param {CID} cid - The CID of the IPLD Node that should be retrieved.
   * @param {GetOptions} [options]
   */
  async get (cid, options) {
    const block = await this.bs.get(cid, options)
    const format = await this.getFormat(block.cid.codec)
    const node = format.util.deserialize(block.data)

    return node
  }

  /**
   * Get multiple nodes back from an array of CIDs.
   *
   * @param {Iterable.<CID>} cids - The CIDs of the IPLD Nodes that should be retrieved.
   * @param {GetOptions} [options]
   */
  getMany (cids, options) {
    if (!typical.isIterable(cids) || typeof cids === 'string' ||
        cids instanceof Uint8Array) {
      throw new Error('`cids` must be an iterable of CIDs')
    }

    const ipld = this

    const generator = async function * () {
      for await (const cid of cids) {
        yield ipld.get(cid, options)
      }
    }

    return extendIterator(generator())
  }

  /**
   * Stores the given IPLD Node of a recognized IPLD Format.
   *
   * @param {Object} node - The deserialized IPLD node that should be inserted.
   * @param {CodecCode} format - The multicodec of the format that IPLD Node should be encoded in.
   * @param {PutOptions} [userOptions] -  Options is an object with the following properties.
   */
  async put (node, format, userOptions) {
    if (format === undefined) {
      throw new Error('`put` requires a format')
    }
    if (typeof format !== 'number') {
      throw new Error('`format` parameter must be number (multicodec)')
    }

    const formatImpl = await this.getFormat(format)
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
      await this.bs.put(block, options)
    }

    return cid
  }

  /**
   * Stores the given IPLD Nodes of a recognized IPLD Format.
   *
   * @param {Iterable<any>} nodes - Deserialized IPLD nodes that should be inserted.
   * @param {CodecCode} format - The multicodec of the format that IPLD Node should be encoded in.
   * @param {PutOptions} [userOptions] -  Options are applied to any of the `nodes` and is an object with the following properties.
   */
  putMany (nodes, format, userOptions) {
    if (!typical.isIterable(nodes) || typeof nodes === 'string' ||
        nodes instanceof Uint8Array) {
      throw new Error('`nodes` must be an iterable')
    }
    if (format === undefined) {
      throw new Error('`put` requires a format')
    }
    if (typeof format !== 'number') {
      throw new Error('`format` parameter must be number (multicodec)')
    }

    /** @type {PutOptions} */
    let options
    /** @type {IPLDFormat} */
    let formatImpl

    const ipld = this

    const generator = async function * () {
      for await (const node of nodes) {
        // Lazy load the options not when the iterator is initialized, but
        // when we hit the first iteration. This way the constructor can be
        // a synchronous function.
        if (options === undefined) {
          formatImpl = await ipld.getFormat(format)
          const defaultOptions = {
            hashAlg: formatImpl.defaultHashAlg,
            cidVersion: 1,
            onlyHash: false
          }
          options = mergeOptions(defaultOptions, userOptions)
        }

        yield ipld.put(node, format, options)
      }
    }

    return extendIterator(generator())
  }

  /**
   * Remove an IPLD Node by the given CID.
   *
   * @param {CID} cid - The CID of the IPLD Node that should be removed.
   * @param {RemoveOptions} [options]
   */
  async remove (cid, options) { // eslint-disable-line require-await
    return this.bs.delete(cid, options)
  }

  /**
   * Remove IPLD Nodes by the given CIDs.
   *
   * Throws an error if any of the Blocks can’t be removed. This operation is
   * *not* atomic, some Blocks might have already been removed.
   *
   * @param {Iterable<CID>} cids - The CIDs of the IPLD Nodes that should be removed.
   * @param {RemoveOptions} [options]
   */
  removeMany (cids, options) {
    if (!typical.isIterable(cids) || typeof cids === 'string' ||
        cids instanceof Uint8Array) {
      throw new Error('`cids` must be an iterable of CIDs')
    }

    const ipld = this

    const generator = async function * () {
      for await (const cid of cids) {
        yield ipld.remove(cid, options)
      }
    }

    return extendIterator(generator())
  }

  /**
   * Returns all the paths that can be resolved into.
   *
   * @param {CID} cid - The ID to get the paths from
   * @param {string} [offsetPath=''] - the path to start to retrieve the other paths from.
   * @param {TreeOptions} [userOptions]
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

    /**
     * If a path is a link then follow it and return its CID
     *
     * @param {Block} block
     * @param {string} treePath
     */
    const maybeRecurse = async (block, treePath) => {
      // A treepath we might want to follow recursively
      const format = await this.getFormat(multicodec.getCodeFromName(block.cid.codec))
      const result = format.resolver.resolve(block.data, treePath)
      // Something to follow recursively, hence push it into the queue
      if (CID.isCID(result.value)) {
        return result.value
      }
    }

    const ipld = this

    const generator = async function * () {
      // The list of paths that will get returned
      const treePaths = []
      // The current block, needed to call `isLink()` on every iteration
      let block
      // The list of items we want to follow recursively. The items are
      // an object consisting of the CID and the currently already resolved
      // path
      const queue = [{ cid, basePath: '' }]
      // The path that was already traversed
      let basePath

      // End of iteration if there aren't any paths left to return or
      // if we don't want to traverse recursively and have already
      // returns the first level
      while (treePaths.length > 0 || queue.length > 0) {
        // There aren't any paths left, get them from the given CID
        if (treePaths.length === 0 && queue.length > 0) {
          const next = queue.shift()

          if (next) {
            ({ cid, basePath } = next)
            const format = await ipld.getFormat(multicodec.getCodeFromName(cid.codec))
            block = await ipld.bs.get(cid, options)

            const paths = format.resolver.tree(block.data)
            treePaths.push(...paths)
          }
        }

        const treePath = treePaths.shift() || ''
        let fullPath = basePath + treePath

        // Only follow links if recursion is intended
        if (options.recursive) {
          const cid = await maybeRecurse(block, treePath)

          if (cid != null) {
            queue.push({ cid, basePath: fullPath + '/' })
          }
        }

        // Return it if it matches the given offset path, but is not the
        // offset path itself
        if (offsetPath !== undefined && fullPath.startsWith(offsetPath) &&
            fullPath.length > offsetPath.length) {
          if (offsetPath.length > 0) {
            fullPath = fullPath.slice(offsetPath.length + 1)
          }

          yield fullPath
        }
      }
    }

    return extendIterator(generator())
  }

  /**
   * @param {CodecCode} codec
   */
  async getFormat (codec) {
    // TODO vmx 2019-01-24: Once all CIDs support accessing the codec code
    // instead of the name, remove this part
    if (typeof codec === 'string') {
      codec = multicodec.getCodeFromName(codec)
    }

    if (this.resolvers[codec]) {
      return this.resolvers[codec]
    }

    // If not supported, attempt to dynamically load this format
    const format = await this.loadFormat(codec)
    if (this.resolvers[codec] == null) {
      this.addFormat(format)
    } else {
      return this.resolvers[codec]
    }
    return format
  }
}

/**
 * Default options for IPLD.
 */
IPLDResolver.defaultOptions = {
  /** @type {IPLDFormat[]} */
  formats: [ipldDagCbor, ipldDagPb, ipldRaw]
}

module.exports = IPLDResolver
