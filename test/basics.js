/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('basics', () => {
    it('creates an instance', () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver(bs)
      expect(r.bs).to.exist // eslint-disable-line
    })

    it('creates an in memory repo if no blockService is passed', () => {
      const r = new IPLDResolver()
      expect(r.bs).to.exist // eslint-disable-line
    })

    it.skip('add support to a new format', () => {})
    it.skip('remove support to a new format', () => {})
  })
}
