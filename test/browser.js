/* eslint-env mocha */
/* global self */

'use strict'

const series = require('async/series')
const IPFSRepo = require('ipfs-repo')

const basePath = 'ipfs' + Math.random()

const idb = self.indexedDB ||
  self.mozIndexedDB ||
  self.webkitIndexedDB ||
  self.msIndexedDB

idb.deleteDatabase(basePath)
idb.deleteDatabase(basePath + '/blocks')

describe('Browser', () => {
  const repo = new IPFSRepo(basePath)

  before((done) => {
    series([
      (cb) => repo.init({}, cb),
      (cb) => repo.open(cb)
    ], done)
  })

  after((done) => {
    series([
      (cb) => repo.close(cb),
      (cb) => {
        idb.deleteDatabase(basePath)
        idb.deleteDatabase(basePath + '/blocks')
        cb()
      }
    ], done)
  })

  require('./ipld-bin')
  require('./basics')(repo)
  require('./ipld-dag-pb')(repo)
  require('./ipld-dag-cbor')(repo)
  require('./ipld-git')(repo)
  require('./ipld-eth-block')(repo)
  require('./ipld-eth-star')(repo)
  require('./ipld-all')
})
