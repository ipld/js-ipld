/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const ipldEthBlock = require('ipld-eth-block')
const EthBlockHeader = require('ethereumjs-block/header')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe.skip('IPLD Resolver with eth-block (Ethereum Block)', () => {
    const bs = new BlockService(repo)
    const resolver = new IPLDResolver(bs)

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      node1 = new EthBlockHeader({ number: 1 })
      node2 = new EthBlockHeader({ number: 2 })
      node3 = new EthBlockHeader({ number: 3 })

      series([
        (cb) => {
          ipldEthBlock.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist
            cid1 = cid
            cb()
          })
        },
        (cb) => {
          ipldEthBlock.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist
            cid2 = cid
            cb()
          })
        },
        (cb) => {
          ipldEthBlock.util.cid(node3, (err, cid) => {
            expect(err).to.not.exist
            cid3 = cid
            cb()
          })
        }
      ], done)
    })

    it('resolver.put', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, done)
    })

    it('resolver.putStream', (done) => {
      pull(
        pull.values([
          { node: node1, cid: cid1 },
          { node: node2, cid: cid2 },
          { node: node3, cid: cid3 }
        ]),
        resolver.putStream(done)
      )
    })

    it('resolver.get', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, (err) => {
        expect(err).to.not.exist
        resolver.get(cid1, (err, node) => {
          expect(err).to.not.exist
          expect(node1.number.toString('hex')).to.eql('01')
          expect(node1.raw).to.eql(node.raw)
          expect(node1.hash()).to.eql(node.hash())
          done()
        })
      })
    })

    it('resolver.getStream', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, (err) => {
        expect(err).to.not.exist
        pull(
          resolver.getStream(cid1),
          pull.collect((err, nodes) => {
            expect(err).to.not.exist
            expect(node1.raw).to.eql(nodes[0].raw)
            expect(node1.hash()).to.eql(nodes[0].hash())
            done()
          })
        )
      })
    })

    it('resolver.remove', (done) => {
      resolver.put({
        node: node1,
        cid: cid1
      }, (err) => {
        expect(err).to.not.exist
        resolver.get(cid1, (err, node) => {
          expect(err).to.not.exist
          expect(node1.raw).to.eql(node.raw)
          expect(node1.hash()).to.eql(node.hash())
          remove()
        })
      })

      function remove () {
        resolver.remove(cid1, (err) => {
          expect(err).to.not.exist
          resolver.get(cid1, (err) => {
            expect(err).to.exist
            done()
          })
        })
      }
    })
  })

  describe.skip('IPLD Path Resolver for eth-block', () => {
    let resolver

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      resolver = new IPLDResolver()

      series([
        (cb) => {
          node1 = new EthBlockHeader({
            number: 1
          })

          ipldEthBlock.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist
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
            expect(err).to.not.exist
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
            expect(err).to.not.exist
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
          resolver.putStream(done)
        )
      }
    })

    it('root path (same as get)', (done) => {
      resolver.resolve(cid1, '/', (err, result) => {
        expect(err).to.not.exist

        ipldEthBlock.util.cid(result, (err, cid) => {
          expect(err).to.not.exist
          expect(cid).to.eql(cid1)
          done()
        })
      })
    })

    it('value within 1st node scope', (done) => {
      resolver.resolve(cid1, 'number', (err, result) => {
        expect(err).to.not.exist
        expect(result.toString('hex')).to.eql('01')
        done()
      })
    })

    it('value within nested scope (1 level)', (done) => {
      resolver.resolve(cid2, 'parent/number', (err, result) => {
        expect(err).to.not.exist
        expect(result.toString('hex')).to.eql('01')
        done()
      })
    })

    it('value within nested scope (2 levels)', (done) => {
      resolver.resolve(cid3, 'parent/parent/number', (err, result) => {
        expect(err).to.not.exist
        expect(result.toString('hex')).to.eql('01')
        done()
      })
    })
  })
}
