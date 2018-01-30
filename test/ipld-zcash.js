/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldZcash = require('ipld-zcash')
const ZcashBlock = require('zcash-bitcore-lib').Block
const multihash = require('multihashes')
const series = require('async/series')
const each = require('async/each')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

const buildZcashBlock = (header) => {
  header.version = header.version || 0
  header.prevHash = header.prevHash || Buffer.alloc(32)
  header.merkleRoot = header.merkleRoot || Buffer.alloc(32)
  header.reserved = header.reserved || Buffer.alloc(32)
  header.time = header.time || 0
  header.bits = header.bits || 0
  header.nonce = header.nonce || Buffer.alloc(32)
  header.solution = header.solution || Buffer.alloc(0)
  const block = ZcashBlock.fromObject({
    header: header,
    transactions: []
  })
  return block
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
      resolver = new IPLDResolver(bs)

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

      function store () {
        pull(
          pull.values([
            { node: node1, cid: cid1 },
            { node: node2, cid: cid2 },
            { node: node3, cid: cid3 }
          ]),
          pull.asyncMap((nac, cb) => resolver.put(nac.node, { cid: nac.cid }, cb)),
          pull.onEnd(done)
        )
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

      it('resolver._get', (done) => {
        resolver.put(node1, { cid: cid1 }, (err) => {
          expect(err).to.not.exist()
          resolver.get(cid1, (err, result) => {
            expect(err).to.not.exist()
            expect(node1.header.version).to.eql(result.value.header.version)
            done()
          })
        })
      })
    })

    describe('public api', () => {
      it('resolver.put', (done) => {
        resolver.put(node1, { cid: cid1 }, done)
      })

      it('root path (same as get)', (done) => {
        resolver.get(cid1, '/', (err, result) => {
          expect(err).to.not.exist()

          ipldZcash.util.cid(result.value, (err, cid) => {
            expect(err).to.not.exist()
            expect(cid).to.eql(cid1)
            done()
          })
        })
      })

      it('value within 1st node scope', (done) => {
        resolver.get(cid1, 'version', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql(1)
          done()
        })
      })

      it('value within nested scope (1 level)', (done) => {
        resolver.get(cid2, 'parent/version', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql(1)
          done()
        })
      })

      it('value within nested scope (2 levels)', (done) => {
        resolver.get(cid3, 'parent/parent/version', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql(1)
          done()
        })
      })

      it('resolver.remove', (done) => {
        resolver.put(node1, { cid: cid1 }, (err) => {
          expect(err).to.not.exist()
          resolver.get(cid1, (err, result) => {
            expect(err).to.not.exist()
            expect(result.value.header.version).to.eql(1)
            remove()
          })
        })

        function remove () {
          resolver.remove(cid1, (err) => {
            expect(err).to.not.exist()
            resolver.get(cid1, (err) => {
              expect(err).to.exist()
              done()
            })
          })
        }
      })
    })
  })
}
