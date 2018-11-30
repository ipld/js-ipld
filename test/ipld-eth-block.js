/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldEthBlock = require('ipld-ethereum').ethBlock
const EthBlockHeader = require('ethereumjs-block/header')
const multihash = require('multihashes')
const series = require('async/series')
const each = require('async/each')
const pull = require('pull-stream')

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

    before((done) => {
      const bs = new BlockService(repo)
      resolver = new IPLDResolver({
        blockService: bs,
        formats: [ipldEthBlock]
      })

      series([
        (cb) => {
          node1 = new EthBlockHeader({
            number: 1
          })

          ipldEthBlock.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist()
            cid1 = cid
            cb()
          })
        },
        (cb) => {
          node2 = new EthBlockHeader({
            number: 2,
            parentHash: node1.hash()
          })

          ipldEthBlock.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist()
            cid2 = cid
            cb()
          })
        },
        (cb) => {
          node3 = new EthBlockHeader({
            number: 3,
            parentHash: node2.hash()
          })

          ipldEthBlock.util.cid(node3, (err, cid) => {
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

      // TODO vmx 2018-11-30 Change this test to use `get()`.
      // it('resolver._get', (done) => {
      //   resolver.put(node1, { cid: cid1 }, (err) => {
      //     expect(err).to.not.exist()
      //     resolver.get(cid1, (err, result) => {
      //       expect(err).to.not.exist()
      //       expect(node1.number.toString('hex')).to.eql('01')
      //       expect(node1.raw).to.eql(result.value.raw)
      //       expect(node1.hash()).to.eql(result.value.hash())
      //       done()
      //     })
      //   })
      // })
    })

    describe('public api', () => {
      it('resolver.put', (done) => {
        resolver.put(node1, { cid: cid1 }, done)
      })

      it('resolver.put with format', (done) => {
        resolver.put(node1, { format: 'eth-block' }, (err, cid) => {
          expect(err).to.not.exist()
          expect(cid).to.exist()
          expect(cid.version).to.equal(1)
          expect(cid.codec).to.equal('eth-block')
          expect(cid.multihash).to.exist()
          const mh = multihash.decode(cid.multihash)
          expect(mh.name).to.equal('keccak-256')
          done()
        })
      })

      it('resolver.put with format + hashAlg', (done) => {
        resolver.put(node1, { format: 'eth-block', hashAlg: 'keccak-512' }, (err, cid) => {
          expect(err).to.not.exist()
          expect(cid).to.exist()
          expect(cid.version).to.equal(1)
          expect(cid.codec).to.equal('eth-block')
          expect(cid.multihash).to.exist()
          const mh = multihash.decode(cid.multihash)
          expect(mh.name).to.equal('keccak-512')
          done()
        })
      })

      // TODO vmx 2018-11-30: Implement getting the whole object properly
      // it('root path (same as get)', (done) => {
      //   resolver.get(cid1, '/', (err, result) => {
      //     expect(err).to.not.exist()
      //
      //     ipldEthBlock.util.cid(result.value, (err, cid) => {
      //       expect(err).to.not.exist()
      //       expect(cid).to.eql(cid1)
      //       done()
      //     })
      //   })
      // })

      it('resolves value within 1st node scope', async () => {
        const result = resolver.resolve(cid1, 'number')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value.toString('hex')).to.eql('01')
      })

      it('resolves value within nested scope (1 level)', async () => {
        const result = resolver.resolve(cid2, 'parent/number')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('number')
        expect(node1.value).to.eql(cid1)

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('')
        expect(node2.value.toString('hex')).to.eql('01')
      })

      it('resolves value within nested scope (2 levels)', async () => {
        const result = resolver.resolve(cid3, 'parent/parent/number')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('parent/number')
        expect(node1.value).to.eql(cid2)

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('number')
        expect(node2.value).to.eql(cid1)

        const node3 = await result.first()
        expect(node3.remainderPath).to.eql('')
        expect(node3.value.toString('hex')).to.eql('01')
      })

      // TODO vmx 2018-11-30: remove this `get()` call with the new `get()`
      // it('resolver.remove', (done) => {
      //   resolver.put(node1, { cid: cid1 }, (err) => {
      //     expect(err).to.not.exist()
      //     resolver.get(cid1, (err, result) => {
      //       expect(err).to.not.exist()
      //       const node = result.value
      //       expect(node1.raw).to.eql(node.raw)
      //       expect(node1.hash()).to.eql(node.hash())
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
