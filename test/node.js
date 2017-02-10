/* eslint-env mocha */
'use strict'

const ncp = require('ncp').ncp
const rimraf = require('rimraf')
const IPFSRepo = require('ipfs-repo')
const Store = require('fs-pull-blob-store')
const os = require('os')

describe('Node.js', () => {
  const repoExample = process.cwd() + '/test/example-repo'
  const repoTests = os.tmpDir() + '/t-r-' + Date.now()

  before((done) => ncp(repoExample, repoTests, done))
  after((done) => rimraf(repoTests, done))

  const repo = new IPFSRepo(repoTests, { stores: Store })

  require('./basics')(repo)
  require('./ipld-dag-pb')(repo)
  require('./ipld-dag-cbor')(repo)
  require('./ipld-eth-block')(repo)
  require('./ipld-eth-star')(repo)
  require('./ipld-all')
})
