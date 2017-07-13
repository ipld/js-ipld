/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const CID = require('cids')
const multihash = require('multihashes')

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

  describe('validation', () => {
    it('errors on unknown resolver', (done) => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver(bs)
      // choosing a format that is not supported
      const cid = new CID(1, 'base1', multihash.encode(new Buffer('abcd', 'hex'), 'sha1'))
      r.get(cid, '/', {}, (err, result) => {
        expect(err).to.exist()
        expect(err.message).to.eql('No resolver found for codec "base1"')
        done()
      })
    })
  })
}
