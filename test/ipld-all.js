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
const CID = require('cids')
const inMemory = require('ipld-in-memory')
const multicodec = require('multicodec')
const { Buffer } = require('buffer')

const IPLDResolver = require('../src')

describe('IPLD Resolver for dag-cbor + dag-pb', () => {
  let resolver

  let nodeCbor
  let nodePb
  let cidCbor
  let cidPb

  before(async () => {
    resolver = await inMemory(IPLDResolver)

    nodePb = new dagPB.DAGNode(Buffer.from('I am inside a Protobuf'))
    cidPb = await resolver.put(nodePb, multicodec.DAG_PB, { cidVersion: 0 })

    nodeCbor = {
      someData: 'I am inside a Cbor object',
      pb: cidPb
    }

    cidCbor = await resolver.put(nodeCbor, multicodec.DAG_CBOR)
  })

  it('resolve through different formats', async () => {
    const result = resolver.resolve(cidCbor, 'pb/Data')
    const [node1, node2] = await result.all()

    expect(node1.remainderPath).to.eql('Data')
    expect(node1.value.equals(cidPb)).to.be.true()
    expect(node2.remainderPath).to.eql('')
    expect(node2.value).to.eql(Buffer.from('I am inside a Protobuf'))
  })

  it('does not store nodes when onlyHash is passed', async () => {
    const node = new dagPB.DAGNode(Buffer.from('Some data here'))
    const cid = await resolver.put(node, multicodec.DAG_PB, {
      onlyHash: true,
      cidVersion: 1,
      hashAlg: multicodec.SHA2_256
    })
    const result = await resolver.bs._repo.blocks.has(cid)
    expect(result).to.be.false()
  })

  describe('get', () => {
    it('should return nodes correctly', async () => {
      const result = resolver.getMany([cidCbor, cidPb])
      const [node1, node2] = await result.all()
      expect(node1.someData).to.eql(nodeCbor.someData)
      expect(node1.pb.equals(nodeCbor.pb)).to.be.true()
      expect(node2.Data).to.eql(nodePb.Data)
      expect(node2.Links).to.eql(nodePb.Links)
      expect(node2.size).to.eql(nodePb.size)
    })

    it('should return nodes in input order', async () => {
      const result = resolver.getMany([cidPb, cidCbor])
      const [node1, node2] = await result.all()
      expect(node1.Data).to.eql(nodePb.Data)
      expect(node1.Links).to.eql(nodePb.Links)
      expect(node1.size).to.eql(nodePb.size)
      expect(node2.someData).to.eql(nodeCbor.someData)
      expect(node2.pb.equals(nodeCbor.pb)).to.be.true()
    })

    it('should return error on invalid CID', async () => {
      const result = resolver.getMany([cidCbor, 'invalidcid'])
      // First node is valid
      await result.next()
      // Second one is not
      await expect(result.next()).to.be.rejectedWith('Not a valid cid')
    })

    it('should return error on non-existent CID', async () => {
      const nonExistentCid = new CID(
        'Qma4hjFTnCasJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP')
      const result = resolver.getMany([cidCbor, nonExistentCid])
      // First node is valid
      await result.next()
      // Second one is not
      await expect(result.next()).to.be.rejectedWith('Not Found')
    })

    it('should return error on invalid input', () => {
      expect(() => resolver.getMany('astring')).to.throw(
        '`cids` must be an iterable of CIDs')
    })
  })
})
