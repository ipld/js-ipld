/* eslint-env mocha */
'use strict'

const chai = require('chai')
const chaiAsProised = require('chai-as-promised')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(chaiAsProised)
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldEthBlock = require('ipld-ethereum').ethBlock
const EthBlockHeader = require('ethereumjs-block/header')
const multihash = require('multihashes')
const multicodec = require('multicodec')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with eth-block (Ethereum Block)', () => {
    let resolver

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before(async () => {
      const bs = new BlockService(repo)
      resolver = new IPLDResolver({
        blockService: bs,
        formats: [ipldEthBlock]
      })

      node1 = {
        _ethObj: new EthBlockHeader({
          number: 1
        })
      }
      node2 = {
        _ethObj: new EthBlockHeader({
          number: 2,
          parentHash: node1._ethObj.hash()
        })
      }
      node3 = {
        _ethObj: new EthBlockHeader({
          number: 3,
          parentHash: node2._ethObj.hash()
        })
      }

      const nodes = [node1, node2, node3]
      const result = resolver.putMany(nodes, multicodec.ETH_BLOCK)
      ;[cid1, cid2, cid3] = await result.all()
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const cid = await resolver.put(node1, multicodec.ETH_BLOCK)
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('eth-block')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('keccak-256')
      })

      it('resolver.put with format + hashAlg', async () => {
        const cid = await resolver.put(node1, multicodec.ETH_BLOCK, {
          hashAlg: multicodec.KECCAK_512
        })
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('eth-block')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('keccak-512')
      })

      it('resolves value within 1st node scope', async () => {
        const result = resolver.resolve(cid1, 'number')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value.toString('hex')).to.eql('01')
      })

      it('resolves value within nested scope (1 level)', async () => {
        const result = resolver.resolve(cid2, 'parent/number')
        const [node1, node2] = await result.all()

        expect(node1.remainderPath).to.eql('number')
        expect(node1.value).to.eql(cid1)

        expect(node2.remainderPath).to.eql('')
        expect(node2.value.toString('hex')).to.eql('01')
      })

      it('resolves value within nested scope (2 levels)', async () => {
        const result = resolver.resolve(cid3, 'parent/parent/number')
        const [node1, node2, node3] = await result.all()

        expect(node1.remainderPath).to.eql('parent/number')
        expect(node1.value).to.eql(cid2)

        expect(node2.remainderPath).to.eql('number')
        expect(node2.value).to.eql(cid1)

        expect(node3.remainderPath).to.eql('')
        expect(node3.value.toString('hex')).to.eql('01')
      })

      it('resolver.get round-trip', async () => {
        const cid = await resolver.put(node1, multicodec.ETH_BLOCK)
        const node = await resolver.get(cid)
        // TODO vmx 2018-12-12: Find out why the full nodes not deep equal
        expect(node.raw).to.deep.equal(node1.raw)
      })

      it('resolver.remove', async () => {
        const cid = await resolver.put(node1, multicodec.ETH_BLOCK)
        const sameAsNode1 = await resolver.get(cid)
        expect(sameAsNode1.raw).to.deep.equal(node1.raw)
        return remove()

        async function remove () {
          await resolver.remove(cid)
          // Verify that the item got really deleted
          await expect(resolver.get(cid)).to.eventually.be.rejected()
        }
      })
    })
  })
}
