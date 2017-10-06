/* eslint-env mocha */
'use strict'

const ncp = require('ncp').ncp
const rimraf = require('rimraf')
const IPFSRepo = require('ipfs-repo')
const series = require('async/series')
const os = require('os')

describe('Node.js', () => {
  const repoExample = process.cwd() + '/test/example-repo'
  const repoTests = os.tmpDir() + '/t-r-' + Date.now()
  const repo = new IPFSRepo(repoTests)

  before((done) => {
    series([
      (cb) => ncp(repoExample, repoTests, cb),
      (cb) => repo.open(cb)
    ], done)
  })

  after((done) => {
    series([
      (cb) => repo.close(cb),
      (cb) => rimraf(repoTests, cb)
    ], done)
  })

  require('./basics')(repo)
  require('./ipld-dag-pb')(repo)
  require('./ipld-dag-cbor')(repo)
  require('./ipld-git')(repo)
  require('./ipld-eth-block')(repo)
  require('./ipld-eth')(repo)
  require('./ipld-all')
})
