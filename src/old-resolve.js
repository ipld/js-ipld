'use strict'

const isIPFS = require('is-ipfs')
const includes = require('lodash.includes')
const ipld = require('ipld')

const IPLDService = require('./ipld-service')

const LINK_SYMBOL = ipld.LINK_SYMBOL

module.exports = function resolve (service, path, cb) {
  if (!(service instanceof IPLDService)) {
    return cb(new Error('Missing IPLDService'))
  }

  function access (parts, obj, cb) {
    const isRoot = obj === null && (isIPFS.multihash(parts[0]) || isIPFS.ipfsPath('/' + parts.join('/')))
    const next = parts.shift()
    const isLink = obj && Object.keys(obj).length === 1 && obj[LINK_SYMBOL]
    const fetchLink = obj && (next ? !includes(Object.keys(obj), next) : true)

    if (!obj && !isRoot) {
      cb(new Error('No root object provided'))
    } else if (isLink && fetchLink) {
      // resolve links in objects with an / property
      const link = obj[LINK_SYMBOL]
      const linkParts = splitLink(link)
      let blockLink = ''

      if (linkParts[0] === 'ipfs') {
        // /ipfs/<multihash>
        blockLink = linkParts[1]
        parts = linkParts.slice(2).concat(parts)
      } else if (isIPFS.multihash(linkParts[0])) {
        // /<multihash>
        blockLink = linkParts[0]

        parts = linkParts.slice(1).concat(parts)
      } else {
        return cb(new Error(`Invalid link: "${link}"`))
      }

      service.get(blockLink, (err, block) => {
        if (err) {
          return cb(err)
        }
        if (next) {
          // Put back so it's resolved in the next node
          parts.unshift(next)
        }
        access(parts, block, cb)
      })
    } else if (isRoot) {
      let blockLink = next
      if (next === 'ipfs') {
        blockLink = parts.shift()
      }
      service.get(blockLink, (err, block) => {
        if (err) {
          return cb(err)
        }

        access(parts, block, cb)
      })
    } else if (next) {
      access(parts, obj[next], cb)
    } else {
      cb(null, obj)
    }
  }

  access(splitLink(path), null, cb)
}

function splitLink (link) {
  return link
    // Remove prefix /
    .replace(/^\//, '')
    // Hack to ignore escaped slashes
    .replace(/([^\\])\//g, '$1\u000B').split('\u000B')
}
