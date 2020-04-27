/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldBitcoin = require('ipld-bitcoin')
const BitcoinBlock = require('bitcoinjs-lib').Block
const multihash = require('multihashes')
const multicodec = require('multicodec')
const { Buffer } = require('buffer')

const IPLDResolver = require('../src')

const buildBitcoinBlock = (header) => {
  const block = new BitcoinBlock()
  block.version = header.version || 0
  block.prevHash = header.prevHash || Buffer.alloc(32)
  block.merkleRoot = header.merkleRoot || Buffer.alloc(32)
  block.timestamp = header.timestamp || 0
  block.bits = header.bits || 0
  block.nonce = header.nonce || 0
  return block
}

module.exports = (repo) => {
  describe('IPLD Resolver with ipld-bitcoin', () => {
    let resolver

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3
    let serialized1

    before(async () => {
      const bs = new BlockService(repo)
      resolver = new IPLDResolver({
        blockService: bs,
        formats: [ipldBitcoin]
      })

      node1 = buildBitcoinBlock({
        version: 1
      })
      serialized1 = ipldBitcoin.util.serialize(node1)
      cid1 = await ipldBitcoin.util.cid(serialized1)
      const prevHash1 = multihash.decode(cid1.multihash).digest

      node2 = buildBitcoinBlock({
        version: 2,
        prevHash: prevHash1
      })
      const serialized2 = ipldBitcoin.util.serialize(node2)
      cid2 = await ipldBitcoin.util.cid(serialized2)
      const prevHash2 = multihash.decode(cid2.multihash).digest

      node3 = buildBitcoinBlock({
        version: 3,
        prevHash: prevHash2
      })
      const serialized3 = ipldBitcoin.util.serialize(node3)
      cid3 = await ipldBitcoin.util.cid(serialized3)

      const nodes = [node1, node2, node3]
      const result = resolver.putMany(nodes, multicodec.BITCOIN_BLOCK)
      ;[cid1, cid2, cid3] = await result.all()
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const cid = await resolver.put(node1, multicodec.BITCOIN_BLOCK)
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('bitcoin-block')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('dbl-sha2-256')
      })

      it('resolver.put with format + hashAlg', async () => {
        const cid = await resolver.put(node1, multicodec.BITCOIN_BLOCK, {
          hashAlg: multicodec.SHA3_512
        })
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('bitcoin-block')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha3-512')
      })

      it('resolves value within 1st node scope', async () => {
        const result = resolver.resolve(cid1, 'version')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value).to.eql(1)
      })

      it('resolves value within nested scope (1 level)', async () => {
        const result = resolver.resolve(cid2, 'parent/version')
        const [node1, node2] = await result.all()

        expect(node1.remainderPath).to.eql('version')
        expect(node1.value).to.eql(cid1)

        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql(1)
      })

      it('resolves value within nested scope (2 levels)', async () => {
        const result = resolver.resolve(cid3, 'parent/parent/version')
        const [node1, node2, node3] = await result.all()

        expect(node1.remainderPath).to.eql('parent/version')
        expect(node1.value).to.eql(cid2)

        expect(node2.remainderPath).to.eql('version')
        expect(node2.value).to.eql(cid1)

        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql(1)
      })

      it('resolver.get round-trip', async () => {
        const expectedNode = ipldBitcoin.util.deserialize(serialized1)
        const node = await resolver.get(cid1)
        expect(node).to.deep.equal(expectedNode)
      })

      it('resolver.remove', async () => {
        const expectedNode = ipldBitcoin.util.deserialize(serialized1)
        const sameAsNode1 = await resolver.get(cid1)
        expect(sameAsNode1).to.deep.equal(expectedNode)

        await resolver.remove(cid1)
        // Verify that the item got really deleted
        await expect(resolver.get(cid1)).to.eventually.be.rejected()
      })
    })
  })
}
