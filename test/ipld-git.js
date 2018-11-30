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
const each = require('async/each')
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
              hash: { '/': blobCid.buffer },
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
            tree: { '/': treeCid.buffer },
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
            tree: { '/': treeCid.buffer },
            parents: [
              { '/': commitCid.buffer }
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
            object: { '/': commit2Cid.buffer },
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
      it('resolver._put', (done) => {
        each([
          { node: blobNode, cid: blobCid },
          { node: treeNode, cid: treeCid },
          { node: commitNode, cid: commitCid },
          { node: commit2Node, cid: commit2Cid },
          { node: tagNode, cid: tagCid }
        ], (nc, cb) => {
          resolver._put(nc.cid, nc.node, cb)
        }, done)
      })

      // TODO vmx 2018-11-30 Change this test to use `get()`.
      // it('resolver._get', (done) => {
      //   resolver.put(blobNode, { cid: blobCid }, (err) => {
      //     expect(err).to.not.exist()
      //     resolver.get(blobCid, (err, result) => {
      //       expect(err).to.not.exist()
      //       expect(blobNode.toString('hex')).to.eql(result.value.toString('hex'))
      //       done()
      //     })
      //   })
      // })
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

      // TODO vmx 2018-11-30: Implement getting the whole object properly
      // it('resolver.get empty path', (done) => {
      //   resolver.get(blobCid, '', (err, result) => {
      //     expect(err).to.not.exist()
      //
      //     ipldGit.util.cid(result.value, (err, cid) => {
      //       expect(err).to.not.exist()
      //       expect(cid).to.eql(blobCid)
      //       done()
      //     })
      //   })
      // })

      it('resolves value within 1st node scope', async () => {
        const result = resolver.resolve(commitCid, 'message')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value).to.eql('Initial commit\n')
      })

      it('resolves value within nested node scope (commit/tree)', async () => {
        const result = resolver.resolve(commitCid, 'tree/somefile/mode')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('somefile/mode')
        expect(node1.value).to.eql(treeCid)

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql('100644')
      })

      it('resolves value within nested node scope (commit/tree/blob)', async () => {
        const result = resolver.resolve(commitCid, 'tree/somefile/hash')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('somefile/hash')
        expect(node1.value).to.eql(treeCid)

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql(blobCid)

        const node3 = await result.first()
        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql(blobNode)
      })

      it('resolves value within nested node scope (commit/commit/tree/blob)', async () => {
        const result = resolver.resolve(commit2Cid, 'parents/0/tree/somefile/hash')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('tree/somefile/hash')
        expect(node1.value).to.eql(commitCid)

        // The nodes in between were already tested by some other test
        const last = await result.last()
        expect(last.remainderPath).to.eql('')
        expect(last.value).to.eql(blobNode)
      })

      it('resolves value within nested node scope (tag/commit/commit/tree/blob)', async () => {
        const result = resolver.resolve(tagCid,
          'object/parents/0/tree/somefile/hash')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('parents/0/tree/somefile/hash')
        expect(node1.value).to.eql(commit2Cid)

        // The nodes in between were already tested by some other test
        const last = await result.last()
        expect(last.remainderPath).to.eql('')
        expect(last.value).to.eql(blobNode)
      })

      // // TODO vmx 2018-11-30: remove this `get()` call with the new `get()`
      // it('resolver.remove', (done) => {
      //   resolver.put(blobNode, { cid: blobCid }, (err) => {
      //     expect(err).to.not.exist()
      //     resolver.get(blobCid, (err, result) => {
      //       expect(err).to.not.exist()
      //       const node = result.value
      //       expect(blobNode.toString('hex')).to.eql(node.toString('hex'))
      //       remove()
      //     })
      //   })
      //
      //   function remove () {
      //     resolver.remove(blobCid, (err) => {
      //       expect(err).to.not.exist()
      //       resolver.get(blobCid, (err) => {
      //         expect(err).to.exist()
      //         done()
      //       })
      //     })
      //   }
      // })
    })
  })
}
