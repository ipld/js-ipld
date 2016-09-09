/* eslint-env mocha */
'use strict'

const eachSeries = require('async/eachSeries')
const Store = require('idb-pull-blob-store')
const _ = require('lodash')
const IPFSRepo = require('ipfs-repo')
const pull = require('pull-stream')
const repoContext = require.context('buffer!./example-repo', true)

const tests = require('./ipld-tests')

const idb = window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB

idb.deleteDatabase('ipfs')
idb.deleteDatabase('ipfs/blocks')

describe('ipfs merkle dag browser tests', function () {
  before(function (done) {
    this.timeout(10000)

    var repoData = []
    repoContext.keys().forEach(function (key) {
      repoData.push({
        key: key.replace('./', ''),
        value: repoContext(key)
      })
    })

    const mainBlob = new Store('ipfs')
    const blocksBlob = new Store('ipfs/blocks')

    eachSeries(repoData, (file, cb) => {
      if (_.startsWith(file.key, 'datastore/')) {
        return cb()
      }

      const blocks = _.startsWith(file.key, 'blocks/')
      const blob = blocks ? blocksBlob : mainBlob
      const key = blocks ? file.key.replace(/^blocks\//, '') : file.key

      pull(
        pull.values([file.value]),
        blob.write(key, cb)
      )
    }, done)
  })

  const repo = new IPFSRepo('ipfs', {stores: Store})
  tests(repo)
})
