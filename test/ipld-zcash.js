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
const each = require('async/each')
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
        const result = resolver.put(nodes, multicodec.ZCASH_BLOCK)
        ;[cid1, cid2, cid3] = await result.all()

        done()
      }
    })

    describe('internals', () => {
      it('resolver._put', (done) => {
        each([
          { node: node1, cid: cid1 },
          { node: node2, cid: cid2 },
          { node: node3, cid: cid3 }
        ], (nc, cb) => {
          resolver._put(nc.cid, nc.node, cb)
        }, done)
      })

      // // TODO vmx 2018-11-30 Change this test to use `get()`.
      // it('resolver._get', (done) => {
      //   resolver.put(node1, { cid: cid1 }, (err) => {
      //     expect(err).to.not.exist()
      //     resolver.get(cid1, (err, result) => {
      //       expect(err).to.not.exist()
      //       expect(node1.version).to.eql(result.value.version)
      //       done()
      //     })
      //   })
      // })
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const result = resolver.put([node1], multicodec.ZCASH_BLOCK)
        const cid = await result.first()
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('zcash-block')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('dbl-sha2-256')
      })

      it('resolver.put with format + hashAlg', async () => {
        const result = resolver.put([node1], multicodec.ZCASH_BLOCK, {
          hashAlg: multicodec.SHA3_512
        })
        const cid = await result.first()
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('zcash-block')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha3-512')
      })

      // // TODO vmx 2018-11-30: Implement getting the whole object properly
      // it('root path (same as get)', (done) => {
      //   resolver.get(cid1, '/', (err, result) => {
      //     expect(err).to.not.exist()
      //
      //     ipldZcash.util.cid(result.value, (err, cid) => {
      //       expect(err).to.not.exist()
      //       expect(cid).to.eql(cid1)
      //       done()
      //     })
      //   })
      // })

      it('resolves value within 1st node scope', async () => {
        const result = resolver.resolve(cid1, 'version')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value).to.eql(1)
      })

      it('resolves value within nested scope (1 level)', async () => {
        const result = resolver.resolve(cid2, 'parent/version')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('version')
        expect(node1.value).to.eql(cid1)

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql(1)
      })

      it('resolves value within nested scope (2 levels)', async () => {
        const result = resolver.resolve(cid3, 'parent/parent/version')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('parent/version')
        expect(node1.value).to.eql(cid2)

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('version')
        expect(node2.value).to.eql(cid1)

        const node3 = await result.first()
        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql(1)
      })

      // // TODO vmx 2018-11-30: remove this `get()` call with the new `get()`
      // it('resolver.remove', (done) => {
      //   resolver.put(node1, { cid: cid1 }, (err) => {
      //     expect(err).to.not.exist()
      //     resolver.get(cid1, (err, result) => {
      //       expect(err).to.not.exist()
      //       expect(result.value.version).to.eql(1)
      //       remove()
      //     })
      //   })
      //
      //   function remove () {
      //     resolver.remove(cid1, (err) => {
      //       expect(err).to.not.exist()
      //       resolver.get(cid1, (err) => {
      //         expect(err).to.exist()
      //         done()
      //       })
      //     })
      //   }
      // })
    })
  })
}
