/* eslint-env mocha */
'use strict'

const fs = require('fs-extra')
const IPFSRepo = require('ipfs-repo')
const promisify = require('promisify-es6')
const os = require('os')

describe('Node.js', () => {
  const repoExample = process.cwd() + '/test/example-repo'
  const repoTests = os.tmpdir() + '/t-r-' + Date.now()
  const repo = new IPFSRepo(repoTests)

  const repoOpen = promisify(repo.open.bind(repo))
  const repoClose = promisify(repo.close.bind(repo))

  before(async () => {
    await fs.copy(repoExample, repoTests)
    await repoOpen()
  })

  after(async () => {
    await repoClose()
    await fs.remove(repoTests)
  })

  require('./basics')(repo)
  require('./format-support')(repo)
  require('./ipld-dag-pb')(repo)
  require('./ipld-dag-cbor')(repo)
  require('./ipld-git')(repo)
  require('./ipld-eth-block')(repo)
  require('./ipld-eth')(repo)
  require('./ipld-bitcoin')(repo)
  require('./ipld-zcash')(repo)
  require('./ipld-all')
})
