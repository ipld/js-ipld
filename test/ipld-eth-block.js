/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldEthBlock = require('ipld-ethereum').ethBlock
const EthBlockHeader = require('ethereumjs-block/header')
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
      resolver = new IPLDResolver(bs)

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

      it('resolver._get', (done) => {
        resolver.put(node1, { cid: cid1 }, (err) => {
          expect(err).to.not.exist()
          resolver.get(cid1, (err, result) => {
            expect(err).to.not.exist()
            expect(result.length).to.eq(1)
            expect(node1.number.toString('hex')).to.eql('01')
            expect(node1.raw).to.eql(result[0].value.raw)
            expect(node1.hash()).to.eql(result[0].value.hash())
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
          expect(result.length).to.eq(1)

          ipldEthBlock.util.cid(result[0].value, (err, cid) => {
            expect(err).to.not.exist()
            expect(cid).to.eql(cid1)
            done()
          })
        })
      })

      it('value within 1st node scope', (done) => {
        resolver.get(cid1, 'number', (err, result) => {
          expect(err).to.not.exist()
          expect(result.length).to.eq(1)
          expect(result[0].value.toString('hex')).to.eql('01')
          done()
        })
      })

      it('value within nested scope (1 level)', (done) => {
        resolver.get(cid2, 'parent/number', (err, result) => {
          expect(err).to.not.exist()
          expect(result.length).to.eq(2)
          expect(result[1].value.toString('hex')).to.eql('01')
          done()
        })
      })

      it('value within nested scope (2 levels)', (done) => {
        resolver.get(cid3, 'parent/parent/number', (err, result) => {
          expect(err).to.not.exist()
          expect(err).to.not.exist()
          expect(result.length).to.eq(3)
          expect(result[2].value.toString('hex')).to.eql('01')
          done()
        })
      })

      it('resolver.remove', (done) => {
        resolver.put(node1, { cid: cid1 }, (err) => {
          expect(err).to.not.exist()
          resolver.get(cid1, (err, result) => {
            expect(err).to.not.exist()
            const node = result[0].value
            expect(node1.raw).to.eql(node.raw)
            expect(node1.hash()).to.eql(node.hash())
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
