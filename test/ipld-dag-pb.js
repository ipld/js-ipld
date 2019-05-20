/* eslint-env mocha */
'use strict'

const chai = require('chai')
const chaiAsProised = require('chai-as-promised')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(chaiAsProised)
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const dagPB = require('ipld-dag-pb')
const multihash = require('multihashes')
const multicodec = require('multicodec')
const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with dag-pb (MerkleDAG Protobuf)', () => {
    let resolver
    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before(async () => {
      const bs = new BlockService(repo)
      resolver = new IPLDResolver({ blockService: bs })

      node1 = dagPB.DAGNode.create(Buffer.from('I am 1'))
      node2 = dagPB.DAGNode.create(Buffer.from('I am 2'))
      node3 = dagPB.DAGNode.create(Buffer.from('I am 3'))
      const serialized1 = dagPB.util.serialize(node1)
      cid1 = await dagPB.util.cid(serialized1)
      node2 = await dagPB.DAGNode.addLink(node2, {
        name: '1',
        size: node1.Tsize,
        cid: cid1
      })
      node3 = await dagPB.DAGNode.addLink(node3, {
        name: '1',
        size: node1.size,
        cid: cid1
      })
      const serialized2 = dagPB.util.serialize(node2)
      cid2 = await dagPB.util.cid(serialized2)
      node3 = await dagPB.DAGNode.addLink(node3, {
        name: '2',
        size: node2.size,
        cid: cid2
      })

      const nodes = [node1, node2, node3]
      const result = resolver.putMany(nodes, multicodec.DAG_PB)
      ;[cid1, cid2, cid3] = await result.all()
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const cid = await resolver.put(node1, multicodec.DAG_PB)
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('dag-pb')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha2-256')
      })

      it('resolver.put with format + hashAlg', async () => {
        const cid = await resolver.put(node1, multicodec.DAG_PB, {
          hashAlg: multicodec.SHA3_512
        })
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('dag-pb')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha3-512')
      })

      it('resolves a value within 1st node scope', async () => {
        const result = resolver.resolve(cid1, 'Data')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value).to.eql(Buffer.from('I am 1'))
      })

      it('resolves a value within nested scope (1 level)', async () => {
        const result = resolver.resolve(cid2, 'Links/0/Hash/Data')
        const [node1, node2] = await result.all()

        expect(node1.remainderPath).to.eql('Data')
        expect(node1.value.equals(cid1)).to.be.true()

        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql(Buffer.from('I am 1'))
      })

      it('resolves value within nested scope (2 levels)', async () => {
        const result = resolver.resolve(cid3, 'Links/1/Hash/Links/0/Hash/Data')
        const [node1, node2, node3] = await result.all()

        expect(node1.remainderPath).to.eql('Links/0/Hash/Data')
        expect(node1.value.equals(cid2)).to.be.true()

        expect(node2.remainderPath).to.eql('Data')
        expect(node2.value.equals(cid1)).to.be.true()

        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql(Buffer.from('I am 1'))
      })

      it('resolves value within nested scope (2 levels) with named links', async () => {
        const result = resolver.resolve(cid3, '2/1/Data')
        const [node1, node2, node3] = await result.all()

        expect(node1.remainderPath).to.eql('1/Data')
        expect(node1.value.equals(cid2)).to.be.true()

        expect(node2.remainderPath).to.eql('Data')
        expect(node2.value.equals(cid1)).to.be.true()

        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql(Buffer.from('I am 1'))
      })

      it('resolver.get round-trip', async () => {
        const cid = await resolver.put(node1, multicodec.DAG_PB)
        const node = await resolver.get(cid)
        // `size` is lazy, without a call to it a deep equal check would fail
        const _ = node.size // eslint-disable-line no-unused-vars
        expect(node).to.deep.equal(node1)
      })

      it('resolver.remove', async () => {
        // TODO vmx 2018-12-12: The same repo is used for all tests, there
        // seems to be some race condition with inserting and removing items.
        // Hence create a unique item for this test. Though the tests
        // should really be independent so that there are no race conditions.
        const node = dagPB.DAGNode.create(Buffer.from('a dag-pb node'))
        const cid = await resolver.put(node, multicodec.DAG_PB)
        const sameAsNode = await resolver.get(cid)
        // `size` is lazy, without a call to it a deep equal check would fail
        const _ = sameAsNode.size // eslint-disable-line no-unused-vars
        expect(sameAsNode.data).to.deep.equal(node.data)
        return remove()

        async function remove () {
          await resolver.remove(cid)
          // Verify that the item got really deleted
          await expect(resolver.get(cid)).to.eventually.be.rejected()
        }
      })

      it('should return a v0 CID when specified', async () => {
        const node = dagPB.DAGNode.create(Buffer.from('a dag-pb node'))
        const cid = await resolver.put(node, multicodec.DAG_PB, {
          cidVersion: 0
        })

        expect(cid.version).to.equal(0)
      })

      it('should return a v1 CID when specified', async () => {
        const node = dagPB.DAGNode.create(Buffer.from('a dag-pb node'))
        const cid = await resolver.put(node, multicodec.DAG_PB, {
          cidVersion: 1
        })

        expect(cid.version).to.equal(1)
      })
    })
  })
}
