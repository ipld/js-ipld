/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const dagPB = require('ipld-dag-pb')
const multihash = require('multihashing')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  const bs = new BlockService(repo)
  const resolver = new IPLDResolver(bs)

  describe('IPLD Resolver with dag-pb (MerkleDAG Protobuf)', () => {
    before(() => {
      // Create a bunch o nodes to be used
    })

    it('throws when not passed a repo', () => {
      expect(() => new IPLDResolver()).to.throw(/requires a BlockService/)
    })

    it.skip('resolver.put', (done) => {
      /*
      const node = {
        name: 'hello.txt',
        size: 11
      }

      ipldService.put(node, done)
      */
    })

    it.skip('resolver.putStream', (done) => {
      /*
      pull(
        pull.values([
          {name: 'pull.txt', size: 12}
        ]),
        ipldService.putStream(done)
      )
      */
    })

    it.skip('resolver.get', (done) => {
      /*
      const node = {
        name: 'world.txt',
        size: 11
      }

      ipldService.put(node, (err) => {
        expect(err).to.not.exist

        const mh = multihash(ipld.marshal(node), 'sha2-256')

        ipldService.get(mh, (err, fetchedNode) => {
          expect(err).to.not.exist
          expect(node).to.deep.equal(fetchedNode)
          done()
        })
      })
      */
    })

    it.skip('resolver.getStream', (done) => {
      /*
      const node = {
        name: 'put.txt',
        size: 15
      }
      const mh = multihash(ipld.marshal(node), 'sha2-256')
      pull(
        pull.values([node]),
        ipldService.putStream(read)
      )

      function read (err) {
        expect(err).to.not.exist
        pull(
          ipldService.getStream(mh),
          pull.collect((err, res) => {
            expect(err).to.not.exist
            expect(res[0]).to.be.eql(node)
            done()
          })
        )
      }
      */
    })

    it.skip('resolver.getRecursive', (done) => {
      // 1 -> 2 -> 3
      /*
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

    it.skip('resolver.remove', (done) => {
      /*
      const node = {data: 'short lived node'}
      const mh = multihash(ipld.marshal(node), 'sha2-256')

      series([
        (cb) => ipldService.put(node, cb),
        (cb) => ipldService.get(mh, cb),
        (cb) => ipldService.remove(mh, cb),
        (cb) => ipldService.get(mh, (err) => {
          expect(err).to.exist
          cb()
        })
      ], done)
      */
    })
  })

  describe('IPLD Path Resolver', () => {
  })
}
