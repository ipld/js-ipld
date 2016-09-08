/* eslint-env mocha */
'use strict'

const ncp = require('ncp').ncp
const rimraf = require('rimraf')
const expect = require('chai').expect
const IPFSRepo = require('ipfs-repo')
const Store = require('fs-pull-blob-store')

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

  const repo = new IPFSRepo(repoTests, {stores: Store})

  tests(repo)
})
