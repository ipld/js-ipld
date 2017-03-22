/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('basics', () => {
    it('creates an instance', () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver(bs)
      expect(r.bs).to.exist()
    })

    it('creates an in memory repo if no blockService is passed', () => {
      IPLDResolver.inMemory((err, r) => {
        expect(err).to.not.exist()
        expect(r.bs).to.exist()
      })
    })

    it.skip('add support to a new format', () => {})
    it.skip('remove support to a new format', () => {})
  })
}
