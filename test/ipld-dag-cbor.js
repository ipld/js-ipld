/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const dagCBOR = require('ipld-dag-cbor')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with dag-cbor (MerkleDAG CBOR)', () => {
    let resolver

    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      const bs = new BlockService(repo)

      resolver = new IPLDResolver(bs)

      series([
        (cb) => {
          node1 = { someData: 'I am 1' }

          dagCBOR.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist()
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
            expect(err).to.not.exist()
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
            expect(err).to.not.exist()
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
          pull.asyncMap((nac, cb) => resolver.put(nac.node, { cid: nac.cid }, cb)),
          pull.onEnd(done)
        )
      }
    })

    describe('internals', () => {
      it('resolver._putStream', (done) => {
        pull(
          pull.values([
            { node: node1, cid: cid1 },
            { node: node2, cid: cid2 },
            { node: node3, cid: cid3 }
          ]),
          resolver._putStream(done)
        )
      })

      it('resolver._get', (done) => {
        resolver.put(node1, { cid: cid1 }, (err) => {
          expect(err).to.not.exist()
          resolver._get(cid1, (err, node) => {
            expect(err).to.not.exist()
            expect(node1).to.eql(node)
            done()
          })
        })
      })

      it('resolver._getStream', (done) => {
        resolver.put(node1, { cid: cid1 }, (err) => {
          expect(err).to.not.exist()
          pull(
            resolver._getStream(cid1),
            pull.collect((err, nodes) => {
              expect(err).to.not.exist()
              expect(node1).to.eql(nodes[0])
              done()
            })
          )
        })
      })
    })

    describe('public api', () => {
      it('resolver.put with CID', (done) => {
        resolver.put(node1, { cid: cid1 }, done)
      })

      it('resolver.put with hashAlg + format', (done) => {
        resolver.put(node1, {
          format: 'dag-cbor',
          hashAlg: 'sha2-256'
        }, done)
      })

      it('resolver.get just CID', (done) => {
        resolver.get(cid1, (err, result) => {
          expect(err).to.not.exist()

          dagCBOR.util.cid(result.value, (err, cid) => {
            expect(err).to.not.exist()
            expect(cid).to.eql(cid1)
            done()
          })
        })
      })

      it('resolver.get root path', (done) => {
        resolver.get(cid1, '/', (err, result) => {
          expect(err).to.not.exist()

          dagCBOR.util.cid(result.value, (err, cid) => {
            expect(err).to.not.exist()
            expect(cid).to.eql(cid1)
            done()
          })
        })
      })

      it('resolver.get relative path `.` (same as get /)', (done) => {
        resolver.get(cid1, '.', (err, result) => {
          expect(err).to.not.exist()

          dagCBOR.util.cid(result.value, (err, cid) => {
            expect(err).to.not.exist()
            expect(cid).to.eql(cid1)
            done()
          })
        })
      })

      it('resolver.get relative path `./` (same as get /)', (done) => {
        resolver.get(cid1, './', (err, result) => {
          expect(err).to.not.exist()

          dagCBOR.util.cid(result.value, (err, cid) => {
            expect(err).to.not.exist()
            expect(cid).to.eql(cid1)
            done()
          })
        })
      })

      it('resolver.get relative path `./one/someData` (same as get one/someData)', (done) => {
        resolver.get(cid2, './one/someData', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('I am 1')
          done()
        })
      })

      it('resolver.get relative path `one/./someData` (same as get one/someData)', (done) => {
        resolver.get(cid2, 'one/./someData', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('I am 1')
          done()
        })
      })

      it('resolver.get double slash at the beginning `//one/someData` (same as get one/someData)', (done) => {
        resolver.get(cid2, '//one/someData', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('I am 1')
          done()
        })
      })

      it('resolver.get double slash in the middle `one//someData` (same as get one/someData)', (done) => {
        resolver.get(cid2, 'one//someData', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('I am 1')
          done()
        })
      })

      it('resolver.get value within 1st node scope', (done) => {
        resolver.get(cid1, 'someData', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('I am 1')
          done()
        })
      })

      it('resolver.get value within nested scope (0 level)', (done) => {
        resolver.get(cid2, 'one', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql({
            someData: 'I am 1'
          })
          done()
        })
      })

      it('resolver.get value within nested scope (1 level)', (done) => {
        resolver.get(cid2, 'one/someData', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('I am 1')
          done()
        })
      })

      it('resolver.get value within nested scope (2 levels)', (done) => {
        resolver.get(cid3, 'two/one/someData', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('I am 1')
          expect(result.remainderPath).to.eql('')

          done()
        })
      })

      it('resolver.tree', (done) => {
        pull(
          resolver.treeStream(cid3),
          pull.collect((err, values) => {
            expect(err).to.not.exist()
            expect(values).to.eql([
              'one',
              'two',
              'someData'
            ])
            done()
          })
        )
      })

      it('resolver.tree with exist()ent path', (done) => {
        pull(
          resolver.treeStream(cid3, 'one'),
          pull.collect((err, values) => {
            expect(err).to.not.exist()
            expect(values).to.eql([])
            done()
          })
        )
      })

      it('resolver.tree with non exist()ent path', (done) => {
        pull(
          resolver.treeStream(cid3, 'bananas'),
          pull.collect((err, values) => {
            expect(err).to.not.exist()
            expect(values).to.eql([])
            done()
          })
        )
      })

      it('resolver.tree recursive', (done) => {
        pull(
          resolver.treeStream(cid3, { recursive: true }),
          pull.collect((err, values) => {
            expect(err).to.not.exist()
            expect(values).to.eql([
              'one',
              'two',
              'someData',
              'one/someData',
              'two/one',
              'two/someData',
              'two/one/someData'
            ])
            done()
          })
        )
      })

      it('resolver.tree with exist()ent path recursive', (done) => {
        pull(
          resolver.treeStream(cid3, 'two', { recursive: true }),
          pull.collect((err, values) => {
            expect(err).to.not.exist()
            expect(values).to.eql([
              'one',
              'someData',
              'one/someData'
            ])
            done()
          })
        )
      })

      it('resolver.remove', (done) => {
        resolver.put(node1, { cid: cid1 }, (err) => {
          expect(err).to.not.exist()
          resolver.get(cid1, (err, result) => {
            expect(err).to.not.exist()
            expect(node1).to.eql(result.value)
            remove()
          })
        })

        function remove () {
          resolver.remove(cid1, (err) => {
            expect(err).to.not.exist()
            resolver.get(cid1, (err) => {
              expect(err).to.exist()
              done()
            })
          })
        }
      })
    })
  })
}
