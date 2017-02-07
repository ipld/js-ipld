/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const dagPB = require('ipld-dag-pb')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe.only('IPLD Resolver with dag-pb (MerkleDAG Protobuf)', () => {
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
          dagPB.DAGNode.create(new Buffer('I am 1'), (err, node) => {
            expect(err).to.not.exist
            node1 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 2'), (err, node) => {
            expect(err).to.not.exist
            node2 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(new Buffer('I am 3'), (err, node) => {
            expect(err).to.not.exist
            node3 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.addLink(node2, {
            name: '1',
            size: node1.size,
            multihash: node1.multihash
          }, (err, node) => {
            expect(err).to.not.exist
            node2 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.addLink(node3, {
            name: '1',
            size: node1.size,
            multihash: node1.multihash
          }, (err, node) => {
            expect(err).to.not.exist
            node3 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.addLink(node3, {
            name: '2',
            size: node2.size,
            multihash: node2.multihash
          }, (err, node) => {
            expect(err).to.not.exist
            node3 = node
            cb()
          })
        }
      ], cids)

      function cids () {
        series([
          (cb) => {
            dagPB.util.cid(node1, (err, cid) => {
              expect(err).to.not.exist
              cid1 = cid
              cb()
            })
          },
          (cb) => {
            dagPB.util.cid(node2, (err, cid) => {
              expect(err).to.not.exist
              cid2 = cid
              cb()
            })
          },
          (cb) => {
            dagPB.util.cid(node3, (err, cid) => {
              expect(err).to.not.exist
              cid3 = cid
              cb()
            })
          }
        ], store)
      }

      function store () {
        pull(
          pull.values([
            { node: node1, cid: cid1 },
            { node: node2, cid: cid2 },
            { node: node3, cid: cid3 }
          ]),
          pull.asyncMap((nac, cb) => resolver.put(nac.node, nac.cid, cb)),
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

      it('resolver._getStream', (done) => {
        resolver.put(node1, cid1, (err) => {
          expect(err).to.not.exist
          pull(
            resolver._getStream(cid1),
            pull.collect((err, nodes) => {
              expect(err).to.not.exist
              done()
            })
          )
        })
      })

      it('resolver._get', (done) => {
        resolver.put(node1, cid1, (err) => {
          expect(err).to.not.exist
          pull(
            resolver._getStream(cid1),
            pull.collect((err, nodes) => {
              expect(err).to.not.exist
              done()
            })
          )
        })
      })
    })

    describe('public api', () => {
      it('resolver.put with CID', (done) => {
        resolver.put(node1, cid1, done)
      })

      it('resolver.put with hashAlg + format', (done) => {
        resolver.put(node1, 'dag-pb', 'sha2-256', done)
      })

      it('resolver.get just CID', (done) => {
        resolver.put(node1, cid1, (err) => {
          expect(err).to.not.exist
          resolver.get(cid1, (err, node) => {
            expect(err).to.not.exist
            done()
          })
        })
      })

      it('resolver.get root path', (done) => {
        resolver.get(cid1, '/', (err, result) => {
          expect(err).to.not.exist

          dagPB.util.cid(result, (err, cid) => {
            expect(err).to.not.exist
            expect(cid).to.eql(cid1)
            done()
          })
        })
      })

      it('resolver.get value within 1st node scope', (done) => {
        resolver.get(cid1, 'data', (err, result) => {
          expect(err).to.not.exist
          expect(result).to.eql(new Buffer('I am 1'))
          done()
        })
      })

      it('resolver.get value within nested scope (1 level)', (done) => {
        resolver.get(cid2, 'links/0/data', (err, result) => {
          expect(err).to.not.exist
          expect(result).to.eql(new Buffer('I am 1'))
          done()
        })
      })

      it('resolver.get value within nested scope (2 levels)', (done) => {
        resolver.get(cid3, 'links/1/links/0/data', (err, result) => {
          expect(err).to.not.exist
          expect(result).to.eql(new Buffer('I am 1'))
          done()
        })
      })

      it.skip('resolver.get with option localResolve: true', () => {})

      it('resolver.remove', (done) => {
        resolver.put(node1, cid1, (err) => {
          expect(err).to.not.exist
          resolver.get(cid1, (err, node) => {
            expect(err).to.not.exist
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
  })
}
