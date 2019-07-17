/* eslint-env mocha */
'use strict'

const fs = require('fs-extra')
const IPFSRepo = require('ipfs-repo')
const os = require('os')

describe('Node.js', () => {
  const repoExample = process.cwd() + '/test/example-repo'
  const repoTests = os.tmpdir() + '/t-r-' + Date.now()
  const repo = new IPFSRepo(repoTests)

  before(async () => {
    await fs.copy(repoExample, repoTests)
    await repo.open()
  })

  after(async () => {
    await repo.close()
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
