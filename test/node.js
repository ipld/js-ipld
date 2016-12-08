/* eslint-env mocha */
'use strict'

const ncp = require('ncp').ncp
const rimraf = require('rimraf')
const IPFSRepo = require('ipfs-repo')
const Store = require('fs-pull-blob-store')

describe('Node.js', () => {
  const repoExample = process.cwd() + '/test/example-repo'
  const repoTests = process.cwd() + '/test/repo-just-for-test' + Date.now()

  before((done) => {
    process.env.IPFS_PATH = repoTests
    ncp(repoExample, repoTests, done)
  })

  after((done) => {
    rimraf(repoTests, done)
  })

  const repo = new IPFSRepo(repoTests, { stores: Store })

  require('./test-ipld-dag-pb')(repo)
  require('./test-ipld-dag-cbor')(repo)
  require('./test-ipld-eth-block')(repo)
  require('./test-ipld-all-together-now')
})
