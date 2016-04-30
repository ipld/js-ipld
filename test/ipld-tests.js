/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
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

    describe('links are hashes', () => {
      const aliceAbout = {
        age: 22
      }
      const bob = {
        name: 'Bob'
      }
      const alice = {
        name: 'Alice',
        about: {
          '@link': ipld.multihash(ipld.marshal(aliceAbout))
        },
        friends: [{
          '@link': ipld.multihash(ipld.marshal(bob))
        }]
      }
      const mh = ipld.multihash(ipld.marshal(alice))

      before((done) => {
        async.series([
          (cb) => ipldService.add(aliceAbout, cb),
          (cb) => ipldService.add(alice, cb),
          (cb) => ipldService.add(bob, cb)
        ], done)
      })

      it('link to object', (done) => {
        resolve(ipldService, `${mh}/about`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(aliceAbout)
          done()
        })
      })

      it('link to property in a different object', (done) => {
        resolve(ipldService, `${mh}/about/age`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(aliceAbout.age)
          done()
        })
      })

      it('link to an element in array', (done) => {
        resolve(ipldService, `${mh}/friends/0`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(bob)
          done()
        })
      })

      it('link to property in an element in array', (done) => {
        resolve(ipldService, `${mh}/friends/0/name`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(bob.name)
          done()
        })
      })
    })

    describe('links are merkle paths', () => {
      const draft = {
        title: 'Title of the blogpost'
      }

      const alice = {
        name: 'Alice'
      }

      const author = {
        name: {
          '@link': `/${ipld.multihash(ipld.marshal(alice))}/name`
        }
      }

      const blogpost = {
        title: {
          '@link': `/${ipld.multihash(ipld.marshal(draft))}/title`
        },
        author: {
          '@link': `/ipfs/${ipld.multihash(ipld.marshal(author))}`
        }
      }

      const mh = ipld.multihash(ipld.marshal(blogpost))

      before((done) => {
        async.series([
          (cb) => ipldService.add(draft, cb),
          (cb) => ipldService.add(alice, cb),
          (cb) => ipldService.add(author, cb),
          (cb) => ipldService.add(blogpost, cb)
        ], done)
      })

      it('merkle-link pointing to a string', (done) => {
        resolve(ipldService, `${mh}/title`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(draft.title)
          done()
        })
      })

      it.skip('merkle-link pointing to an object', (done) => {
        resolve(ipldService, `${mh}/author`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(author)
          done()
        })
      })

      it.skip('merkle-link pointing to link to an object', (done) => {
        resolve(ipldService, `${mh}/author/name`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(alice.name)
          done()
        })
      })

      it.skip('ipfs merkle-link to an object', (done) => {
        resolve(ipldService, `/ipfs/${mh}/author`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(author)
          done()
        })
      })
    })
  })
}
