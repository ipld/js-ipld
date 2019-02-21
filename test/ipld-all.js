/* eslint-env mocha */
'use strict'

/*
 * Test different types of data structures living together
 * &
 * Test data made of mixed data structures!
 */

const chai = require('chai')
const chaiAsProised = require('chai-as-promised')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(chaiAsProised)
chai.use(dirtyChai)
const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')
const each = require('async/each')
const waterfall = require('async/waterfall')
const CID = require('cids')
const inMemory = require('ipld-in-memory')
const multicodec = require('multicodec')

const IPLDResolver = require('../src')

describe('IPLD Resolver for dag-cbor + dag-pb', () => {
  let resolver

  let nodeCbor
  let nodePb
  let cidCbor
  let cidPb

  before((done) => {
    waterfall([
      (cb) => inMemory(IPLDResolver, cb),
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
          { node: nodePb, format: multicodec.DAG_PB, cidVersion: 0 },
          { node: nodeCbor, format: multicodec.DAG_CBOR, cidVersion: 1 }
        ], (nac, cb) => {
          resolver.put([nac.node], nac.format, {
            cidVersion: nac.cidVersion
          }).first().then(
            () => cb(null),
            (error) => cb(error)
          )
        }, cb)
      }
    ], done)
  })

  it('resolve through different formats', async () => {
    const result = resolver.resolve(cidCbor, 'pb/Data')

    const node1 = await result.first()
    expect(node1.remainderPath).to.eql('Data')
    expect(node1.value).to.eql(cidPb)

    const node2 = await result.first()
    expect(node2.remainderPath).to.eql('')
    expect(node2.value).to.eql(Buffer.from('I am inside a Protobuf'))
  })

  it('does not store nodes when onlyHash is passed', (done) => {
    waterfall([
      (cb) => dagPB.DAGNode.create(Buffer.from('Some data here'), cb),
      (node, cb) => {
        const result = resolver.put([node], multicodec.DAG_PB, {
          onlyHash: true,
          cidVersion: 1,
          hashAlg: multicodec.SHA2_256
        })
        result.first().then(
          (cid) => cb(null, cid),
          (error) => cb(error)
        )
      },
      (cid, cb) => resolver.bs._repo.blocks.has(cid, cb)
    ], (error, result) => {
      if (error) {
        return done(error)
      }

      expect(result).to.be.false()
      done()
    })
  })

  describe('get', () => {
    it('should return nodes correctly', async () => {
      const result = resolver.get([cidCbor, cidPb])
      const [node1, node2] = await result.all()
      expect(node1).to.eql(nodeCbor)
      expect(node2).to.eql(nodePb)
    })

    it('should return nodes in input order', async () => {
      const result = resolver.get([cidPb, cidCbor])
      const [node1, node2] = await result.all()
      expect(node1).to.eql(nodePb)
      expect(node2).to.eql(nodeCbor)
    })

    it('should return error on invalid CID', async () => {
      const result = resolver.get([cidCbor, 'invalidcid'])
      // First node is valid
      await result.next()
      // Second one is not
      await expect(result.next()).to.be.rejectedWith('Not a valid cid')
    })

    it('should return error on non-existent CID', async () => {
      const nonExistentCid = new CID(
        'Qma4hjFTnCasJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP')
      const result = resolver.get([cidCbor, nonExistentCid])
      // First node is valid
      await result.next()
      // Second one is not
      await expect(result.next()).to.be.rejectedWith('Not Found')
    })

    it('should return error on invalid input', () => {
      expect(() => resolver.get('astring')).to.throw(
        '`cids` must be an iterable of CIDs')
    })
  })
})
