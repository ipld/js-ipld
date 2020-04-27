/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldGit = require('ipld-git')
const multihash = require('multihashes')
const multicodec = require('multicodec')
const { Buffer } = require('buffer')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with ipld-git', () => {
    let resolver

    let blobNode
    let treeNode
    let commitNode
    let commit2Node
    let tagNode

    let blobCid
    let treeCid
    let commitCid
    let commit2Cid
    let tagCid

    before(async () => {
      const bs = new BlockService(repo)

      resolver = new IPLDResolver({
        blockService: bs,
        formats: [ipldGit]
      })

      blobNode = Buffer.from('626c6f62203800736f6d6564617461', 'hex') // blob 8\0somedata
      blobCid = await ipldGit.util.cid(blobNode)

      treeNode = {
        somefile: {
          hash: blobCid,
          mode: '100644'
        }
      }
      const treeBlob = ipldGit.util.serialize(treeNode)
      treeCid = await ipldGit.util.cid(treeBlob)

      commitNode = {
        gitType: 'commit',
        tree: treeCid,
        parents: [],
        author: {
          name: 'John Doe',
          email: 'johndoe@example.com',
          date: '1497302532 +0200'
        },
        committer: {
          name: 'John Doe',
          email: 'johndoe@example.com',
          date: '1497302532 +0200'
        },
        message: 'Initial commit\n'
      }
      const commitBlob = ipldGit.util.serialize(commitNode)
      commitCid = await ipldGit.util.cid(commitBlob)

      commit2Node = {
        gitType: 'commit',
        tree: treeCid,
        parents: [
          commitCid
        ],
        author: {
          name: 'John Doe',
          email: 'johndoe@example.com',
          date: '1497302533 +0200'
        },
        committer: {
          name: 'John Doe',
          email: 'johndoe@example.com',
          date: '1497302533 +0200'
        },
        message: 'Change nothing\n'
      }
      const commit2Blob = ipldGit.util.serialize(commit2Node)
      commit2Cid = await ipldGit.util.cid(commit2Blob)

      tagNode = {
        gitType: 'tag',
        object: commit2Cid,
        type: 'commit',
        tag: 'v0.0.0',
        tagger: {
          name: 'John Doe',
          email: 'johndoe@example.com',
          date: '1497302534 +0200'
        },
        message: 'First release\n'
      }
      const tagBlob = ipldGit.util.serialize(tagNode)
      tagCid = await ipldGit.util.cid(tagBlob)

      const nodes = [blobNode, treeNode, commitNode, commit2Node, tagNode]
      const result = resolver.putMany(nodes, multicodec.GIT_RAW)
      ;[blobCid, treeCid, commitCid, commit2Cid, tagCid] = await result.all()
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const cid = await resolver.put(blobNode, multicodec.GIT_RAW)
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('git-raw')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha1')
      })

      it('resolver.put with format + hashAlg', async () => {
        const cid = await resolver.put(blobNode, multicodec.GIT_RAW, {
          hashAlg: multicodec.SHA3_512
        })
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('git-raw')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha3-512')
      })

      it('resolves value within 1st node scope', async () => {
        const result = resolver.resolve(commitCid, 'message')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value).to.eql('Initial commit\n')
      })

      it('resolves value within nested node scope (commit/tree)', async () => {
        const result = resolver.resolve(commitCid, 'tree/somefile/mode')
        const [node1, node2] = await result.all()

        expect(node1.remainderPath).to.eql('somefile/mode')
        expect(node1.value).to.eql(treeCid)

        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql('100644')
      })

      it('resolves value within nested node scope (commit/tree/blob)', async () => {
        const result = resolver.resolve(commitCid, 'tree/somefile/hash')
        const [node1, node2, node3] = await result.all()

        expect(node1.remainderPath).to.eql('somefile/hash')
        expect(node1.value).to.eql(treeCid)

        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql(blobCid)

        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql(blobNode)
      })

      it('resolves value within nested node scope (commit/commit/tree/blob)', async () => {
        const result = resolver.resolve(commit2Cid, 'parents/0/tree/somefile/hash')
        const nodes = await result.all()

        const node1 = nodes.shift()
        expect(node1.remainderPath).to.eql('tree/somefile/hash')
        expect(node1.value).to.eql(commitCid)

        // The nodes in between were already tested by some other test
        const last = await nodes.pop()
        expect(last.remainderPath).to.eql('')
        expect(last.value).to.eql(blobNode)
      })

      it('resolves value within nested node scope (tag/commit/commit/tree/blob)', async () => {
        const result = resolver.resolve(tagCid,
          'object/parents/0/tree/somefile/hash')
        const nodes = await result.all()

        const node1 = nodes.shift()
        expect(node1.remainderPath).to.eql('parents/0/tree/somefile/hash')
        expect(node1.value).to.eql(commit2Cid)

        // The nodes in between were already tested by some other test
        const last = nodes.pop()
        expect(last.remainderPath).to.eql('')
        expect(last.value).to.eql(blobNode)
      })

      it('resolver.get round-trip', async () => {
        const cid = await resolver.put(blobNode, multicodec.GIT_RAW)
        const node = await resolver.get(cid)
        expect(node).to.deep.equal(blobNode)
      })

      it('resolver.remove', async () => {
        const cid = await resolver.put(blobNode, multicodec.GIT_RAW)
        const sameAsBlobNode = await resolver.get(cid)
        expect(sameAsBlobNode).to.deep.equal(blobNode)
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
