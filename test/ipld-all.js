/* eslint-env mocha */
'use strict'

/*
 * Test different types of data structures living together
 * &
 * Test data made of mixed data structures!
 */

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')
const each = require('async/each')
const waterfall = require('async/waterfall')
const CID = require('cids')

const IPLDResolver = require('../src')

describe('IPLD Resolver for dag-cbor + dag-pb', () => {
  let resolver

  let nodeCbor
  let nodePb
  let cidCbor
  let cidPb

  before((done) => {
    waterfall([
      (cb) => IPLDResolver.inMemory(cb),
      (res, cb) => {
        resolver = res
        dagPB.DAGNode.create(Buffer.from('I am inside a Protobuf'), cb)
      },
      (node, cb) => {
        nodePb = node
        dagPB.util.cid(nodePb, cb)
      },
      (cid, cb) => {
        cidPb = cid
        nodeCbor = {
          someData: 'I am inside a Cbor object',
          pb: cidPb
        }

        dagCBOR.util.cid(nodeCbor, cb)
      },
      (cid, cb) => {
        cidCbor = cid

        each([
          { node: nodePb, cid: cidPb },
          { node: nodeCbor, cid: cidCbor }
        ], (nac, cb) => {
          resolver.put(nac.node, { cid: nac.cid }, cb)
        }, cb)
      }
    ], done)
  })

  it('resolve through different formats', (done) => {
    resolver.get(cidCbor, 'pb/Data', (err, result) => {
      expect(err).to.not.exist()
      expect(result.value).to.eql(Buffer.from('I am inside a Protobuf'))
      done()
    })
  })

  it('does not store nodes when onlyHash is passed', (done) => {
    waterfall([
      (cb) => dagPB.DAGNode.create(Buffer.from('Some data here'), cb),
      (node, cb) => resolver.put(nodePb, {
        onlyHash: true,
        version: 1,
        hashAlg: 'sha2-256',
        format: 'dag-pb'
      }, cb),
      (cid, cb) => resolver.bs._repo.blocks.has(cid, cb)
    ], (error, result) => {
      if (error) {
        return done(error)
      }

      expect(result).to.be.false()
      done()
    })
  })

  it('does not store nodes when onlyHash is passed and a CID is passed', (done) => {
    const cid = new CID('QmTmxQfEHbQzntsXPTU4ae2ZgBGwseBmS12AkZnKCkuf2G')

    waterfall([
      (cb) => dagPB.DAGNode.create(Buffer.from('Some data here'), cb),
      (node, cb) => resolver.put(nodePb, {
        onlyHash: true,
        cid
      }, cb),
      (cid2, cb) => {
        expect(cid2).to.equal(cid)

        resolver.bs._repo.blocks.has(cid2, cb)
      }
    ], (error, result) => {
      if (error) {
        return done(error)
      }

      expect(result).to.be.false()
      done()
    })
  })

  describe('getMany', () => {
    it('should return nodes correctly', (done) => {
      resolver.getMany([cidCbor, cidPb], (err, result) => {
        expect(err).to.not.exist()
        expect(result.length).to.equal(2)
        expect(result).to.deep.equal([nodeCbor, nodePb])
        done()
      })
    })

    it('should return nodes in input order', (done) => {
      resolver.getMany([cidPb, cidCbor], (err, result) => {
        expect(err).to.not.exist()
        expect(result.length).to.equal(2)
        expect(result).to.deep.equal([nodePb, nodeCbor])
        done()
      })
    })

    it('should return error on invalid CID', (done) => {
      resolver.getMany([cidCbor, 'invalidcid'], (err, result) => {
        expect(err.message).to.equal('Not a valid cid')
        expect(result).to.be.undefined()
        done()
      })
    })

    it('should return error on non-existent CID', (done) => {
      const nonExistentCid = new CID(
        'Qma4hjFTnCasJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP')
      resolver.getMany([cidCbor, nonExistentCid], (err, result) => {
        expect(err.message).to.equal('Not Found')
        expect(result).to.be.undefined()
        done()
      })
    })

    it('should return error on invalid input', (done) => {
      resolver.getMany('astring', (err, result) => {
        expect(err.message).to.equal('Argument must be an array of CIDs')
        expect(result).to.be.undefined()
        done()
      })
    })
  })
})
