/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldZcash = require('ipld-zcash')
const ZcashBlockHeader = require('zcash-bitcore-lib').BlockHeader
const multihash = require('multihashes')
const series = require('async/series')
const multicodec = require('multicodec')

const IPLDResolver = require('../src')

const buildZcashBlock = (header) => {
  // All these fields have a fixed size, if they are not defined, fill them
  // with zeros with the corresponding size
  header.version = header.version || 0
  header.prevHash = header.prevHash || Buffer.alloc(32)
  header.merkleRoot = header.merkleRoot || Buffer.alloc(32)
  header.reserved = header.reserved || Buffer.alloc(32)
  header.time = header.time || 0
  header.bits = header.bits || 0
  header.nonce = header.nonce || Buffer.alloc(32)
  header.solution = header.solution || Buffer.alloc(1344)

  const blockHeader = ZcashBlockHeader(header)
  return blockHeader
}

module.exports = (repo) => {
  describe('IPLD Resolver with ipld-zcash', () => {
    let resolver

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      const bs = new BlockService(repo)
      resolver = new IPLDResolver({
        blockService: bs,
        formats: [ipldZcash]
      })

      series([
        (cb) => {
          node1 = buildZcashBlock({
            version: 1
          })
          ipldZcash.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist()
            cid1 = cid
            cb()
          })
        },
        (cb) => {
          const prevHash = multihash.decode(cid1.multihash).digest
          node2 = buildZcashBlock({
            version: 2,
            prevHash: prevHash
          })

          ipldZcash.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist()
            cid2 = cid
            cb()
          })
        },
        (cb) => {
          const prevHash = multihash.decode(cid2.multihash).digest
          node3 = buildZcashBlock({
            version: 3,
            prevHash: prevHash
          })

          ipldZcash.util.cid(node3, (err, cid) => {
            expect(err).to.not.exist()
            cid3 = cid
            cb()
          })
        }
      ], store)

      async function store () {
        const nodes = [node1, node2, node3]
        const result = resolver.putMany(nodes, multicodec.ZCASH_BLOCK)
        ;[cid1, cid2, cid3] = await result.all()

        done()
      }
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const cid = await resolver.put(node1, multicodec.ZCASH_BLOCK)
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('zcash-block')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('dbl-sha2-256')
      })

      it('resolver.put with format + hashAlg', async () => {
        const cid = await resolver.put(node1, multicodec.ZCASH_BLOCK, {
          hashAlg: multicodec.SHA3_512
        })
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('zcash-block')
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
        const cid = await resolver.put(node1, multicodec.ZCASH_BLOCK)
        const node = await resolver.get(cid)
        expect(node.toString()).to.deep.equal(node1.toString())
      })

      it('resolver.remove', async () => {
        const cid = await resolver.put(node1, multicodec.ZCASH_BLOCK)
        const sameAsNode1 = await resolver.get(cid)
        expect(sameAsNode1).to.deep.equal(node1)
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
