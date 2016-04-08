/* eslint-env mocha */
'use strict'

const ncp = require('ncp').ncp
const rimraf = require('rimraf')
const expect = require('chai').expect
const IPFSRepo = require('ipfs-repo')

const tests = require('./ipld-tests')

describe('node test blocks', () => {
  const repoExample = process.cwd() + '/test/example-repo'
  const repoTests = process.cwd() + '/test/repo-just-for-test' + Date.now()

  before((done) => {
    ncp(repoExample, repoTests, (err) => {
      process.env.IPFS_PATH = repoTests
      expect(err).to.equal(null)
      done()
    })
  })

  after((done) => {
    rimraf(repoTests, (err) => {
      expect(err).to.equal(null)
      done()
    })
  })

  const fsb = require('fs-blob-store')

  const repoOptions = {
    stores: {
      keys: fsb,
      config: fsb,
      datastore: fsb,
      // datastoreLegacy: needs https://github.com/ipfs/js-ipfs-repo/issues/6#issuecomment-164650642
      logs: fsb,
      locks: fsb,
      version: fsb
    }
  }

  var repo = new IPFSRepo(repoTests, repoOptions)
  tests(repo)
})
