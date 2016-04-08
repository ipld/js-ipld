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
    describe('inside a single object', (done) => {
      const node = {
        string: 'hello',
        number: 42,
        object: {
          title: 'world'
        },
        numbers: [0, 1, 2],
        objects: [{
          title: 'test'
        }],
        multiple: {
          levels: {
            down: 'all good!'
          }
        }
      }
      const mh = ipld.multihash(ipld.marshal(node))

      before((done) => {
        ipldService.add(node, done)
      })

      it('resolves direct leaves of type string', (done) => {
        resolve(ipldService, `${mh}/string`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql('hello')
          done()
        })
      })

      it('resolves direct leaves of type number', (done) => {
        resolve(ipldService, `${mh}/number`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(42)
          done()
        })
      })

      it('resolves direct leaves of type object', (done) => {
        resolve(ipldService, `${mh}/object`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql({
            title: 'world'
          })
          done()
        })
      })

      it('resolves subpaths', (done) => {
        resolve(ipldService, `${mh}/multiple/levels/down`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql('all good!')
          done()
        })
      })

      it('resolves arrays of primitives', (done) => {
        resolve(ipldService, `${mh}/numbers/1`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(1)
          done()
        })
      })

      it('resolves arrays of objects', (done) => {
        resolve(ipldService, `${mh}/objects/0/title`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql('test')
          done()
        })
      })
    })

    it('resolves two linked objects', (done) => {
      const file = {
        name: 'world.txt',
        size: 12
      }
      const dir = {
        name: 'hello',
        files: [
          {'@link': ipld.multihash(ipld.marshal(file))}
        ]
      }

      async.series([
        (cb) => ipldService.add(file, cb),
        (cb) => ipldService.add(dir, cb),
        (cb) => {
          const mh = ipld.multihash(ipld.marshal(dir))
          resolve(ipldService, `${mh}/files/0/name`, (err, res) => {
            expect(err).to.not.exist
            expect(res).to.be.eql('world.txt')
            cb()
          })
        }
      ], done)
    })
  })
}
