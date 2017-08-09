/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const BlockService = require('ipfs-block-service')
const multihashing = require('multihashing')

const expect = chai.expect
chai.use(dirtyChai)

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

    it('should not create invalid blocks when data changes', done => {
      const bs = new BlockService(repo)
      const resolver = new IPLDResolver(bs)
      const testObj = {
        one: 1
      }
      resolver.put(testObj, {format: 'dag-cbor', hashAlg: 'sha2-256'}, (err, cid) => {
        expect(err).to.not.exist()
        bs.get(cid, (err, block) => {
          expect(err).to.not.exist()
          const hash = multihashing(block.data, 'sha2-256')
          expect(hash.toString('hex')).to.equal(cid.multihash.toString('hex'))
          done()
        })
      })
      testObj.one = 2
    })

    it.skip('add support to a new format', () => {})
    it.skip('remove support to a new format', () => {})
  })
}
