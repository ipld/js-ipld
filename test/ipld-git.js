/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const ipldGit = require('ipld-git')
const multihash = require('multihashes')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with ipld-git', () => {
    let resolver

    let blobNode
    let treeNode
    let commitNode
    let commit2Node
    let tagNode

    let blobCid
    let treeCid
    let commitCid
    let commit2Cid
    let tagCid

    before((done) => {
      const bs = new BlockService(repo)

      resolver = new IPLDResolver({
        blockService: bs,
        formats: [ipldGit]
      })

      series([
        (cb) => {
          blobNode = Buffer.from('626c6f62203800736f6d6564617461', 'hex') // blob 8\0somedata

          ipldGit.util.cid(blobNode, (err, cid) => {
            expect(err).to.not.exist()
            blobCid = cid
            cb()
          })
        },
        (cb) => {
          treeNode = {
            somefile: {
              hash: {'/': blobCid.buffer},
              mode: '100644'
            }
          }

          ipldGit.util.cid(treeNode, (err, cid) => {
            expect(err).to.not.exist()
            treeCid = cid
            cb()
          })
        },
        (cb) => {
          commitNode = {
            gitType: 'commit',
            tree: {'/': treeCid.buffer},
            parents: [],
            author: {
              name: 'John Doe',
              email: 'johndoe@example.com',
              date: '1497302532 +0200'
            },
            committer: {
              name: 'John Doe',
              email: 'johndoe@example.com',
              date: '1497302532 +0200'
            },
            message: 'Initial commit\n'
          }

          ipldGit.util.cid(commitNode, (err, cid) => {
            expect(err).to.not.exist()
            commitCid = cid
            cb()
          })
        },
        (cb) => {
          commit2Node = {
            gitType: 'commit',
            tree: {'/': treeCid.buffer},
            parents: [
              {'/': commitCid.buffer}
            ],
            author: {
              name: 'John Doe',
              email: 'johndoe@example.com',
              date: '1497302533 +0200'
            },
            committer: {
              name: 'John Doe',
              email: 'johndoe@example.com',
              date: '1497302533 +0200'
            },
            message: 'Change nothing\n'
          }

          ipldGit.util.cid(commit2Node, (err, cid) => {
            expect(err).to.not.exist()
            commit2Cid = cid
            cb()
          })
        },
        (cb) => {
          tagNode = {
            gitType: 'tag',
            object: {'/': commit2Cid.buffer},
            type: 'commit',
            tag: 'v0.0.0',
            tagger: {
              name: 'John Doe',
              email: 'johndoe@example.com',
              date: '1497302534 +0200'
            },
            message: 'First release\n'
          }

          ipldGit.util.cid(tagNode, (err, cid) => {
            expect(err).to.not.exist()
            tagCid = cid
            cb()
          })
        }
      ], store)

      function store () {
        pull(
          pull.values([
            { node: blobNode, cid: blobCid },
            { node: treeNode, cid: treeCid },
            { node: commitNode, cid: commitCid },
            { node: commit2Node, cid: commit2Cid },
            { node: tagNode, cid: tagCid }
          ]),
          pull.asyncMap((nac, cb) => resolver.put(nac.node, { cid: nac.cid }, cb)),
          pull.onEnd(done)
        )
      }
    })

    describe('internals', () => {
      it('resolver._get', (done) => {
        resolver.put(blobNode, { cid: blobCid }, (err) => {
          expect(err).to.not.exist()
          resolver.get(blobCid, (err, result) => {
            expect(err).to.not.exist()
            expect(blobNode.toString('hex')).to.eql(result.value.toString('hex'))
            done()
          })
        })
      })
    })

    describe('public api', () => {
      it('resolver.put', (done) => {
        resolver.put(blobNode, { cid: blobCid }, done)
      })

      it('resolver.put with format', (done) => {
        resolver.put(blobNode, { format: 'git-raw' }, (err, cid) => {
          expect(err).to.not.exist()
          expect(cid).to.exist()
          expect(cid.version).to.equal(1)
          expect(cid.codec).to.equal('git-raw')
          expect(cid.multihash).to.exist()
          const mh = multihash.decode(cid.multihash)
          expect(mh.name).to.equal('sha1')
          done()
        })
      })

      it('resolver.put with format + hashAlg', (done) => {
        resolver.put(blobNode, { format: 'git-raw', hashAlg: 'sha3-512' }, (err, cid) => {
          expect(err).to.not.exist()
          expect(cid).to.exist()
          expect(cid.version).to.equal(1)
          expect(cid.codec).to.equal('git-raw')
          expect(cid.multihash).to.exist()
          const mh = multihash.decode(cid.multihash)
          expect(mh.name).to.equal('sha3-512')
          done()
        })
      })

      it('resolver.get root path', (done) => {
        resolver.get(blobCid, '/', (err, result) => {
          expect(err).to.not.exist()

          ipldGit.util.cid(result.value, (err, cid) => {
            expect(err).to.not.exist()
            expect(cid).to.eql(blobCid)
            done()
          })
        })
      })

      it('value within 1st node scope', (done) => {
        resolver.get(commitCid, 'message', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('Initial commit\n')
          done()
        })
      })

      it('value within nested node scope (commit/tree)', (done) => {
        resolver.get(commitCid, 'tree/somefile/mode', (err, result) => {
          expect(err).to.not.exist()
          expect(result.value).to.eql('100644')
          done()
        })
      })

      it('value within nested node scope (commit/tree/blob)', (done) => {
        resolver.get(commitCid, 'tree/somefile/hash', (err, result) => {
          expect(err).to.not.exist()
          expect(blobNode.toString('hex')).to.eql(result.value.toString('hex'))
          done()
        })
      })

      it('value within nested node scope (commit/commit/tree/blob)', (done) => {
        resolver.get(commit2Cid, 'parents/0/tree/somefile/hash', (err, result) => {
          expect(err).to.not.exist()
          expect(blobNode.toString('hex')).to.eql(result.value.toString('hex'))
          done()
        })
      })

      it('value within nested node scope (tag/commit/commit/tree/blob)', (done) => {
        resolver.get(tagCid, 'object/parents/0/tree/somefile/hash', (err, result) => {
          expect(err).to.not.exist()
          expect(blobNode.toString('hex')).to.eql(result.value.toString('hex'))
          done()
        })
      })

      it('resolver.remove', (done) => {
        resolver.put(blobNode, { cid: blobCid }, (err) => {
          expect(err).to.not.exist()
          resolver.get(blobCid, (err, result) => {
            expect(err).to.not.exist()
            const node = result.value
            expect(blobNode.toString('hex')).to.eql(node.toString('hex'))
            remove()
          })
        })

        function remove () {
          resolver.remove(blobCid, (err) => {
            expect(err).to.not.exist()
            resolver.get(blobCid, (err) => {
              expect(err).to.exist()
              done()
            })
          })
        }
      })
    })
  })
}
