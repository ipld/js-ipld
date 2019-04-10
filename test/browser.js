/* eslint-env mocha */
/* global self */

'use strict'

const IPFSRepo = require('ipfs-repo')
const promisify = require('promisify-es6')

const basePath = 'ipfs' + Math.random()

const idb = self.indexedDB ||
  self.mozIndexedDB ||
  self.webkitIndexedDB ||
  self.msIndexedDB

idb.deleteDatabase(basePath)
idb.deleteDatabase(basePath + '/blocks')

describe('Browser', () => {
  const repo = new IPFSRepo(basePath)

  const repoInit = promisify(repo.init.bind(repo))
  const repoOpen = promisify(repo.open.bind(repo))
  const repoClose = promisify(repo.close.bind(repo))

  before(async () => {
    await repoInit({})
    await repoOpen()
  })

  after(async () => {
    await repoClose()
    idb.deleteDatabase(basePath)
    idb.deleteDatabase(basePath + '/blocks')
  })

  require('./basics')(repo)
  require('./format-support')(repo)
  require('./ipld-dag-pb')(repo)
  require('./ipld-dag-cbor')(repo)
  require('./ipld-git')(repo)
  require('./ipld-eth-block')(repo)
  require('./ipld-eth')(repo)
  require('./ipld-all')
})
