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
const series = require('async/series')
const each = require('async/each')
const pull = require('pull-stream')

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

    before((done) => {
      const bs = new BlockService(repo)
      resolver = new IPLDResolver({
        blockService: bs,
        formats: [ipldBitcoin]
      })

      series([
        (cb) => {
          node1 = buildBitcoinBlock({
            version: 1
          })
          ipldBitcoin.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist()
            cid1 = cid
            cb()
          })
        },
        (cb) => {
          const prevHash = multihash.decode(cid1.multihash).digest
          node2 = buildBitcoinBlock({
            version: 2,
            prevHash: prevHash
          })

          ipldBitcoin.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist()
            cid2 = cid
            cb()
          })
        },
        (cb) => {
          const prevHash = multihash.decode(cid2.multihash).digest
          node3 = buildBitcoinBlock({
            version: 3,
            prevHash: prevHash
          })

          ipldBitcoin.util.cid(node3, (err, cid) => {
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
            expect(node1.version).to.eql(result.value.version)
            done()
          })
        })
      })
    })

    describe('public api', () => {
      it('resolver.put', (done) => {
        resolver.put(node1, { cid: cid1 }, done)
      })

      it('resolver.put with format', (done) => {
        resolver.put(node1, { format: 'bitcoin-block' }, (err, cid) => {
          expect(err).to.not.exist()
          expect(cid).to.exist()
          expect(cid.version).to.equal(1)
          expect(cid.codec).to.equal('bitcoin-block')
          expect(cid.multihash).to.exist()
          const mh = multihash.decode(cid.multihash)
          expect(mh.name).to.equal('dbl-sha2-256')
          done()
        })
      })

      it('resolver.put with format + hashAlg', (done) => {
        resolver.put(node1, { format: 'bitcoin-block', hashAlg: 'sha3-512' }, (err, cid) => {
          expect(err).to.not.exist()
          expect(cid).to.exist()
          expect(cid.version).to.equal(1)
          expect(cid.codec).to.equal('bitcoin-block')
          expect(cid.multihash).to.exist()
          const mh = multihash.decode(cid.multihash)
          expect(mh.name).to.equal('sha3-512')
          done()
        })
      })

      it('root path (same as get)', (done) => {
        resolver.get(cid1, '/', (err, result) => {
          expect(err).to.not.exist()

          ipldBitcoin.util.cid(result.value, (err, cid) => {
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
            expect(result.value.version).to.eql(1)
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
