/* eslint-env mocha */
'use strict'

const path = require('path')
const fs = require('fs-extra')
const IPFSRepo = require('ipfs-repo')
const os = require('os')

describe('Node.js', () => {
  const repoExample = path.join(process.cwd(), 'test/example-repo')
  const repoTests = fs.mkdtempSync(path.join(os.tmpdir(), 'js-ipld-'))
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
