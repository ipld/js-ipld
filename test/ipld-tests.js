/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const ipld = require('ipld')
const multihash = require('multihashing')
const series = require('async/series')
const pull = require('pull-stream')

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

      ipldService.put(node, done)
    })

    it('putStream', (done) => {
      pull(
        pull.values([
          {name: 'pull.txt', size: 12}
        ]),
        ipldService.putStream(done)
      )
    })

    it('gets an ipld node', (done) => {
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
    })

    it('getStream', (done) => {
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
    })

    it('get ipld nodes recursively', (done) => {
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
    })

    it('removes and ipld node', (done) => {
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
        ipldService.put(node, done)
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
          '/': ipld.multihash(ipld.marshal(aliceAbout))
        },
        friends: [{
          '/': ipld.multihash(ipld.marshal(bob))
        }]
      }
      const mh = ipld.multihash(ipld.marshal(alice))

      before((done) => {
        series([
          (cb) => ipldService.put(aliceAbout, cb),
          (cb) => ipldService.put(alice, cb),
          (cb) => ipldService.put(bob, cb)
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
          '/': `/${ipld.multihash(ipld.marshal(alice))}/name`
        }
      }

      const blogpost = {
        title: {
          '/': `/${ipld.multihash(ipld.marshal(draft))}/title`
        },
        author: {
          '/': `/ipfs/${ipld.multihash(ipld.marshal(author))}`
        }
      }

      const mh = ipld.multihash(ipld.marshal(blogpost))

      before((done) => {
        series([
          (cb) => ipldService.put(draft, cb),
          (cb) => ipldService.put(alice, cb),
          (cb) => ipldService.put(author, cb),
          (cb) => ipldService.put(blogpost, cb)
        ], done)
      })

      it('merkle-link pointing to a string', (done) => {
        resolve(ipldService, `${mh}/title`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(draft.title)
          done()
        })
      })

      it('merkle-link pointing to an object', (done) => {
        resolve(ipldService, `${mh}/author`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(author)
          done()
        })
      })

      it('merkle-link pointing to link to an object', (done) => {
        resolve(ipldService, `${mh}/author/name`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(alice.name)
          done()
        })
      })

      it('ipfs merkle-link to an object', (done) => {
        resolve(ipldService, `/ipfs/${mh}/author`, (err, res) => {
          expect(err).to.not.exist
          expect(res).to.be.eql(author)
          done()
        })
      })
    })
  })
}
