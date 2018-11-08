/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const dagCBOR = require('ipld-dag-cbor')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD format support', () => {
    let data, cid

    before((done) => {
      const bs = new BlockService(repo)
      const resolver = new IPLDResolver({ blockService: bs })

      data = { now: Date.now() }

      dagCBOR.util.cid(data, (err, c) => {
        expect(err).to.not.exist()
        cid = c
        resolver.put(data, { cid }, done)
      })
    })

    describe('Dynamic format loading', () => {
      it('should fail to dynamically load format', (done) => {
        const bs = new BlockService(repo)
        const resolver = new IPLDResolver({
          blockService: bs,
          formats: []
        })

        resolver.get(cid, '/', (err) => {
          expect(err).to.exist()
          expect(err.message).to.equal('No resolver found for codec "dag-cbor"')
          done()
        })
      })

      it('should fail to dynamically load format via loadFormat option', (done) => {
        const errMsg = 'BOOM' + Date.now()
        const bs = new BlockService(repo)
        const resolver = new IPLDResolver({
          blockService: bs,
          formats: [],
          loadFormat (codec, callback) {
            if (codec !== 'dag-cbor') return callback(new Error('unexpected codec'))
            setTimeout(() => callback(new Error(errMsg)))
          }
        })

        resolver.get(cid, '/', (err) => {
          expect(err).to.exist()
          expect(err.message).to.equal(errMsg)
          done()
        })
      })

      it('should dynamically load missing format', (done) => {
        const bs = new BlockService(repo)
        const resolver = new IPLDResolver({
          blockService: bs,
          formats: [],
          loadFormat (codec, callback) {
            if (codec !== 'dag-cbor') return callback(new Error('unexpected codec'))
            setTimeout(() => callback(null, dagCBOR))
          }
        })

        resolver.get(cid, '/', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql(data)
          done()
        })
      })
    })
  })
}
