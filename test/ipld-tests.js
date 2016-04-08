/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-blocks').BlockService
const ipld = require('ipld')
const multihash = require('multihashing')
const async = require('async')

const IPLDService = require('../src').IPLDService

module.exports = (repo) => {
  describe('IPLDService', () => {
    let bs
    let ipldService

    before(() => {
      bs = new BlockService(repo)
      ipldService = new IPLDService(bs)
    })

    it('throws when not passed a repo', () => {
      expect(() => new IPLDService()).to.throw(/requires a BlockService/)
    })

    it('adds an ipld node', (done) => {
      const node = {
        name: 'hello.txt',
        size: 11
      }

      ipldService.add(node, (err) => {
        expect(err).to.not.exist
        done()
      })
    })

    it('gets an ipld node', (done) => {
      const node = {
        name: 'world.txt',
        size: 11
      }

      ipldService.add(node, (err) => {
        expect(err).to.not.exist

        const mh = multihash(ipld.marshal(node), 'sha2-256')

        ipldService.get(mh, (err, fetchedNode) => {
          expect(err).to.not.exist
          expect(node).to.deep.equal(fetchedNode)
          done()
        })
      })
    })

    it('get ipld nodes recursively', (done) => {
      // 1 -> 2 -> 3
      const node1 = {data: '1'}
      const node2 = {data: '2'}
      const node3 = {data: '3'}

      node2.ref = {
        '@link': ipld.multihash(ipld.marshal(node3))
      }

      node1.ref = {
        '@link': ipld.multihash(ipld.marshal(node2))
      }

      async.series([
        (cb) => ipldService.add(node1, cb),
        (cb) => ipldService.add(node2, cb),
        (cb) => ipldService.add(node3, cb),
        (cb) => {
          const mh = multihash(ipld.marshal(node1), 'sha2-256')
          ipldService.getRecursive(mh, (err, nodes) => {
            expect(err).to.not.exist
            expect(nodes.length).to.equal(3)
            cb()
          })
        }
      ], (err) => {
        expect(err).to.not.exist
        done()
      })
    })

    it('removes and ipld node', (done) => {
      const node = {data: 'short lived node'}

      ipldService.add(node, (err) => {
        expect(err).to.not.exist
        const mh = multihash(ipld.marshal(node), 'sha2-256')

        ipldService.get(mh, (err, fetchedNode) => {
          expect(err).to.not.exist

          ipldService.remove(mh, (err) => {
            expect(err).to.not.exist

            ipldService.get(mh, (err) => {
              expect(err).to.exist
              done()
            })
          })
        })
      })
    })
  })
}
