/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const CID = require('cids')
const multihash = require('multihashes')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('basics', () => {
    it('creates an instance', () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({blockService: bs})
      expect(r.bs).to.exist()
    })

    it('creates an in memory repo if no blockService is passed', (done) => {
      IPLDResolver.inMemory((err, r) => {
        expect(err).to.not.exist()
        expect(r.bs).to.exist()
        done()
      })
    })

    it.skip('add support to a new format', () => {})
    it.skip('remove support to a new format', () => {})
  })

  describe('validation', () => {
    it('get - errors on unknown resolver', (done) => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({blockService: bs})
      // choosing a format that is not supported
      const cid = new CID(1, 'base1', multihash.encode(Buffer.from('abcd', 'hex'), 'sha1'))
      r.get(cid, '/', {}, (err, result) => {
        expect(err).to.exist()
        expect(err.message).to.eql('No resolver found for codec "base1"')
        done()
      })
    })

    it('_get - errors on unknown resolver', (done) => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({blockService: bs})
      // choosing a format that is not supported
      const cid = new CID(1, 'base1', multihash.encode(Buffer.from('abcd', 'hex'), 'sha1'))
      r.get(cid, (err, result) => {
        expect(err).to.exist()
        expect(err.message).to.eql('No resolver found for codec "base1"')
        done()
      })
    })

    it('put - errors on unknown resolver', (done) => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({blockService: bs})
      // choosing a format that is not supported
      r.put(null, { format: 'base1' }, (err, result) => {
        expect(err).to.exist()
        expect(err.message).to.eql('No resolver found for codec "base1"')
        done()
      })
    })

    it('put - errors if no options', (done) => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({blockService: bs})
      r.put(null, (err, result) => {
        expect(err).to.exist()
        expect(err.message).to.eql('IPLDResolver.put requires options')
        done()
      })
    })

    it('treeStream - errors on unknown resolver', (done) => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({blockService: bs})
      // choosing a format that is not supported
      const cid = new CID(1, 'base1', multihash.encode(Buffer.from('abcd', 'hex'), 'sha1'))
      pull(
        r.treeStream(cid, '/', {}),
        pull.collect(function (err) {
          expect(err).to.exist()
          expect(err.message).to.eql('No resolver found for codec "base1"')
          done()
        })
      )
    })
  })

  describe('performance', () => {
    it('put does not double-serialize nodes', (done) => {
      const r = new IPLDResolver({blockService: {
        put: (block, cb) => cb()
      }})

      let serializationCount = 0
      let cidCount = 0

      const node = 'foo'
      const codec = 'bar'

      const cid = new CID(1, codec, multihash.fromB58String('QmTmxQfEHbQzntsXPTU4ae2ZgBGwseBmS12AkZnKCkuf2G'))

      const resolver = {}
      const util = {
        cid: (node, options, cb) => {
          cidCount++

          if (!Buffer.isBuffer(node)) {
            // need to serialize to get the cid...
            serializationCount++
          }

          cb(null, cid)
        },
        serialize: (node, cb) => {
          serializationCount++

          cb(null, Buffer.alloc(0))
        }
      }

      r.support.add(codec, resolver, util)

      r.put(node, {
        format: codec
      }, (err, cid) => {
        expect(err).to.not.exist()
        expect(cidCount).to.equal(1)
        expect(serializationCount).to.equal(1)

        done()
      })
    })
  })
}
