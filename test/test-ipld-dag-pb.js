/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const dagPB = require('ipld-dag-pb')
// const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with dag-pb (MerkleDAG Protobuf)', () => {
    const bs = new BlockService(repo)
    const resolver = new IPLDResolver(bs)

    let node1
    let node2
    let node3

    before(() => {
      node1 = new dagPB.DAGNode(new Buffer('I am 1'))
      node2 = new dagPB.DAGNode(new Buffer('I am 2'))
      node3 = new dagPB.DAGNode(new Buffer('I am 3'))
    })

    it('creates an in memory repo if no blockService is passed', () => {
      const r = new IPLDResolver()
      expect(r.bs).to.exist
    })

    it('resolver.put', (done) => {
      resolver.put(node1, done)
    })

    it('resolver.putStream', (done) => {
      pull(
        pull.values([
          node1,
          node2,
          node3
        ]),
        resolver.putStream(done)
      )
    })

    it('resolver.get', (done) => {
      resolver.put(node1, (err) => {
        expect(err).to.not.exist
        resolver.get(node1.cid(), (err, node) => {
          expect(err).to.not.exist
          expect(node.multihash()).to.eql(node.multihash())
          done()
        })
      })
    })

    it('resolver.getStream', (done) => {
      resolver.put(node1, (err) => {
        expect(err).to.not.exist
        pull(
          resolver.getStream(node1.cid()),
          pull.collect((err, nodes) => {
            expect(err).to.not.exist
            expect(node1.multihash()).to.eql(nodes[0].multihash())
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
      resolver.put(node1, (err) => {
        expect(err).to.not.exist
        resolver.get(node1.cid(), (err, node) => {
          expect(err).to.not.exist
          expect(node.multihash()).to.eql(node.multihash())
          remove()
        })
      })

      function remove () {
        resolver.remove(node1.cid(), (err) => {
          expect(err).to.not.exist
          resolver.get(node1.cid(), (err, node) => {
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

      node1 = new dagPB.DAGNode(new Buffer('I am 1'))
      node2 = new dagPB.DAGNode(new Buffer('I am 2'))
      node3 = new dagPB.DAGNode(new Buffer('I am 3'))

      node2.addNodeLink('1', node1)

      node3.addNodeLink('1', node1)
      node3.addNodeLink('2', node2)

      pull(
        pull.values([
          node1,
          node2,
          node3
        ]),
        resolver.putStream(done)
      )
    })

    it('root path (same as get)', (done) => {
      resolver.resolve(node1.cid(), '/', (err, result) => {
        expect(err).to.not.exist
        expect(result.cid()).to.eql(node1.cid())
        done()
      })
    })

    it('value within 1st node scope', (done) => {
      resolver.resolve(node1.cid(), 'data', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql(new Buffer('I am 1'))
        done()
      })
    })

    it('value within nested scope (1 level)', (done) => {
      resolver.resolve(node2.cid(), 'links/0/data', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql(new Buffer('I am 1'))
        done()
      })
    })

    it('value within nested scope (2 levels)', (done) => {
      resolver.resolve(node3.cid(), 'links/1/links/0/data', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql(new Buffer('I am 1'))
        done()
      })
    })
  })
}
