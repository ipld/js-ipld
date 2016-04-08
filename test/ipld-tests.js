/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-blocks').BlockService
const ipld = require('ipld')
const multihash = require('multihashing')
const async = require('async')

const IPLDService = require('../src').IPLDService
const resolve = require('../src').resolve

module.exports = (repo) => {
  const bs = new BlockService(repo)
  const ipldService = new IPLDService(bs)

  describe('IPLDService', () => {
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

  describe('resolve', () => {
    it('resolves inside a single object', (done) => {
      const node = {
        hello: {
          world: 11,
          some: 12
        }
      }
      const mh = ipld.multihash(ipld.marshal(node))
      ipldService.add(node, (err) => {
        expect(err).to.not.exist

        resolve(ipldService, `${mh}/hello/world`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(11)
          done()
        })
      })
    })

    describe('across linked objects', () => {
      describe('where links are multihashes', () => {
        const aliceName = 'Alice'
        const aliceAbout = {
          age: 22
        }
        const alice = {
          name: {
            '@link': ipld.multihash(ipld.marshal(aliceName))
          },
          about: {
            '@link': ipld.multihash(ipld.marshal(aliceAbout))
          }
        }
        const mh = ipld.multihash(ipld.marshal(alice))

        before((done) => {
          async.series([
            (cb) => ipldService.add(aliceName, cb),
            (cb) => ipldService.add(aliceAbout, cb),
            (cb) => ipldService.add(alice, cb)
          ], done)
        })

        it('resolves link to string', (done) => {
          resolve(ipldService, `${mh}/name`, (err, res) => {
            expect(err).to.not.exist
            expect(res).to.be.eql('Alice')
            done()
          })
        })

        it('resolves link to object', (done) => {
          resolve(ipldService, `${mh}/about`, (err, res) => {
            expect(err).to.not.exist
            expect(res).to.be.eql({age: 22})
            done()
          })
        })

        it('resolves link to property in a different object', (done) => {
          resolve(ipldService, `${mh}/about/age`, (err, res) => {
            expect(err).to.not.exist
            expect(res).to.be.eql(22)
            done()
          })
        })
      })
    })
  })
}
