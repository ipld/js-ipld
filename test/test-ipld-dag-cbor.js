/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const dagCBOR = require('ipld-dag-cbor')
// const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with dag-cbor (MerkleDAG CBOR)', () => {
    const bs = new BlockService(repo)
    const resolver = new IPLDResolver(bs)

    let node1
    let node2
    let node3

    before(() => {
      node1 = { someData: new Buffer('I am 1') }
      node2 = { someData: new Buffer('I am 2') }
      node3 = { someData: new Buffer('I am 3') }
    })

    it('creates an in memory repo if no blockService is passed', () => {
      const r = new IPLDResolver()
      expect(r.bs).to.exist
    })

    it('resolver.put', (done) => {
      resolver.put({
        node: node1,
        cid: dagCBOR.util.cid(node1)
      }, done)
    })

    it('resolver.putStream', (done) => {
      pull(
        pull.values([
          { node: node1, cid: dagCBOR.util.cid(node1) },
          { node: node2, cid: dagCBOR.util.cid(node2) },
          { node: node3, cid: dagCBOR.util.cid(node3) }
        ]),
        resolver.putStream(done)
      )
    })

    it('resolver.get', (done) => {
      resolver.put({
        node: node1,
        cid: dagCBOR.util.cid(node1)
      }, (err) => {
        expect(err).to.not.exist
        resolver.get(dagCBOR.util.cid(node1), (err, node) => {
          expect(err).to.not.exist
          expect(node1).to.eql(node)
          done()
        })
      })
    })

    it('resolver.getStream', (done) => {
      resolver.put({
        node: node1,
        cid: dagCBOR.util.cid(node1)
      }, (err) => {
        expect(err).to.not.exist
        pull(
          resolver.getStream(dagCBOR.util.cid(node1)),
          pull.collect((err, nodes) => {
            expect(err).to.not.exist
            expect(node1).to.eql(nodes[0])
            done()
          })
        )
      })
    })

    it.skip('resolver.getRecursive', (done) => {
      /*
      // 1 -> 2 -> 3
      const node1 = {data: '1'}
      const node2 = {data: '2'}
      const node3 = {data: '3'}

      node2.ref = {
        '/': ipld.multihash(ipld.marshal(node3))
      }

      node1.ref = {
        '/': ipld.multihash(ipld.marshal(node2))
      }

      series([
        (cb) => ipldService.put(node1, cb),
        (cb) => ipldService.put(node2, cb),
        (cb) => ipldService.put(node3, cb),
        (cb) => {
          const mh = multihash(ipld.marshal(node1), 'sha2-256')
          ipldService.getRecursive(mh, (err, nodes) => {
            expect(err).to.not.exist
            expect(nodes).to.have.length(3)
            cb()
          })
        }
      ], (err) => {
        expect(err).to.not.exist
        done()
      })
      */
    })

    it('resolver.remove', (done) => {
      resolver.put({
        node: node1,
        cid: dagCBOR.util.cid(node1)
      }, (err) => {
        expect(err).to.not.exist
        resolver.get(dagCBOR.util.cid(node1), (err, node) => {
          expect(err).to.not.exist
          expect(node1).to.eql(node)
          remove()
        })
      })

      function remove () {
        resolver.remove(dagCBOR.util.cid(node1), (err) => {
          expect(err).to.not.exist
          resolver.get(dagCBOR.util.cid(node1), (err) => {
            expect(err).to.exist
            done()
          })
        })
      }
    })
  })

  describe('IPLD Path Resolver', () => {
    let resolver

    let node1
    let node2
    let node3

    before((done) => {
      resolver = new IPLDResolver()

      node1 = {
        someData: 'I am 1'
      }
      node2 = {
        someData: 'I am 2',
        'one': { '/': dagCBOR.util.cid(node1).toBaseEncodedString() }
      }
      node3 = {
        someData: 'I am 3',
        'one': { '/': dagCBOR.util.cid(node1).toBaseEncodedString() },
        'two': { '/': dagCBOR.util.cid(node2).toBaseEncodedString() }
      }

      pull(
        pull.values([
          { node: node1, cid: dagCBOR.util.cid(node1) },
          { node: node2, cid: dagCBOR.util.cid(node2) },
          { node: node3, cid: dagCBOR.util.cid(node3) }
        ]),
        resolver.putStream(done)
      )
    })

    it('root path (same as get)', (done) => {
      resolver.resolve(dagCBOR.util.cid(node1), '/', (err, result) => {
        expect(err).to.not.exist
        expect(dagCBOR.util.cid(result)).to.eql(dagCBOR.util.cid(node1))
        done()
      })
    })

    it('value within 1st node scope', (done) => {
      resolver.resolve(dagCBOR.util.cid(node1), 'someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('value within nested scope (1 level)', (done) => {
      resolver.resolve(dagCBOR.util.cid(node2), 'one/someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('value within nested scope (2 levels)', (done) => {
      resolver.resolve(dagCBOR.util.cid(node3), 'two/one/someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })
  })
}
