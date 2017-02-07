/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const dagCBOR = require('ipld-dag-cbor')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with dag-cbor (MerkleDAG CBOR)', () => {
    const bs = new BlockService(repo)
    const resolver = new IPLDResolver(bs)

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      node1 = { someData: new Buffer('I am 1') }
      node2 = { someData: new Buffer('I am 2') }
      node3 = { someData: new Buffer('I am 3') }

      series([
        (cb) => {
          dagCBOR.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist
            cid1 = cid
            cb()
          })
        },
        (cb) => {
          dagCBOR.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist
            cid2 = cid
            cb()
          })
        },
        (cb) => {
          dagCBOR.util.cid(node3, (err, cid) => {
            expect(err).to.not.exist
            cid3 = cid
            cb()
          })
        }
      ], done)
    })

    it('creates an in memory repo if no blockService is passed', () => {
      const r = new IPLDResolver()
      expect(r.bs).to.exist
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
          expect(node1).to.eql(node)
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
            expect(node1).to.eql(nodes[0])
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
          expect(node1).to.eql(node)
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

  describe('IPLD Path Resolver for dag-cbor', () => {
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
          node1 = {
            someData: 'I am 1'
          }

          dagCBOR.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist
            cid1 = cid
            cb()
          })
        },
        (cb) => {
          node2 = {
            someData: 'I am 2',
            one: { '/': cid1.toBaseEncodedString() }
          }

          dagCBOR.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist
            cid2 = cid
            cb()
          })
        },
        (cb) => {
          node3 = {
            someData: 'I am 3',
            one: { '/': cid1.toBaseEncodedString() },
            two: { '/': cid2.toBaseEncodedString() }
          }

          dagCBOR.util.cid(node3, (err, cid) => {
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

        dagCBOR.util.cid(result, (err, cid) => {
          expect(err).to.not.exist
          expect(cid).to.eql(cid1)
          done()
        })
      })
    })

    it('relative path `.` (same as get /)', (done) => {
      resolver.resolve(cid1, '.', (err, result) => {
        expect(err).to.not.exist

        dagCBOR.util.cid(result, (err, cid) => {
          expect(err).to.not.exist
          expect(cid).to.eql(cid1)
          done()
        })
      })
    })

    it('relative path `./` (same as get /)', (done) => {
      resolver.resolve(cid1, './', (err, result) => {
        expect(err).to.not.exist

        dagCBOR.util.cid(result, (err, cid) => {
          expect(err).to.not.exist
          expect(cid).to.eql(cid1)
          done()
        })
      })
    })

    it('relative path `./one/someData` (same as get one/someData)', (done) => {
      resolver.resolve(cid2, './one/someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('relative path `one/./someData` (same as get one/someData)', (done) => {
      resolver.resolve(cid2, 'one/./someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('double slash at the beginning `//one/someData` (same as get one/someData)', (done) => {
      resolver.resolve(cid2, '//one/someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('double slash in the middle `one//someData` (same as get one/someData)', (done) => {
      resolver.resolve(cid2, 'one//someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('value within 1st node scope', (done) => {
      resolver.resolve(cid1, 'someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('value within nested scope (0 level)', (done) => {
      resolver.resolve(cid2, 'one', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql({
          someData: 'I am 1'
        })
        done()
      })
    })

    it('value within nested scope (1 level)', (done) => {
      resolver.resolve(cid2, 'one/someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })

    it('value within nested scope (2 levels)', (done) => {
      resolver.resolve(cid3, 'two/one/someData', (err, result) => {
        expect(err).to.not.exist
        expect(result).to.eql('I am 1')
        done()
      })
    })
  })
}
