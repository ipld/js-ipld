/* eslint-env mocha */
'use strict'

const eachSeries = require('async/eachSeries')
const Store = require('idb-pull-blob-store')
const _ = require('lodash')
const IPFSRepo = require('ipfs-repo')
const pull = require('pull-stream')
const repoContext = require.context('buffer!./example-repo', true)

const basePath = 'ipfs' + Math.random()

const idb = window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB

idb.deleteDatabase(basePath)
idb.deleteDatabase(basePath + '/blocks')

describe('Browser', () => {
  before((done) => {
    const repoData = []
    repoContext.keys().forEach(function (key) {
      repoData.push({
        key: key.replace('./', ''),
        value: repoContext(key)
      })
    })

    const mainBlob = new Store(basePath)
    const blocksBlob = new Store(basePath + '/blocks')

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

  const repo = new IPFSRepo(basePath, { stores: Store })

  require('./test-ipld-dag-pb')(repo)
  require('./test-ipld-dag-cbor')(repo)
  require('./test-ipld-eth-block')(repo)
  require('./test-ipld-all-together-now')
})
