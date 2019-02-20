/* eslint-env mocha */
'use strict'

const chai = require('chai')
const chaiAsProised = require('chai-as-promised')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(chaiAsProised)
chai.use(dirtyChai)
const BlockService = require('ipfs-block-service')
const dagPB = require('ipld-dag-pb')
const series = require('async/series')
const multihash = require('multihashes')
const multicodec = require('multicodec')
const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD Resolver with dag-pb (MerkleDAG Protobuf)', () => {
    let resolver
    let node1
    let node2
    let node3
    let cid1
    let cid2
    let cid3

    before((done) => {
      const bs = new BlockService(repo)

      resolver = new IPLDResolver({ blockService: bs })

      series([
        (cb) => {
          dagPB.DAGNode.create(Buffer.from('I am 1'), (err, node) => {
            expect(err).to.not.exist()
            node1 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(Buffer.from('I am 2'), (err, node) => {
            expect(err).to.not.exist()
            node2 = node
            cb()
          })
        },
        (cb) => {
          dagPB.DAGNode.create(Buffer.from('I am 3'), (err, node) => {
            expect(err).to.not.exist()
            node3 = node
            cb()
          })
        },
        (cb) => {
          dagPB.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist()

            dagPB.DAGNode.addLink(node2, {
              name: '1',
              size: node1.size,
              cid
            }, (err, node) => {
              expect(err).to.not.exist()
              node2 = node
              cb()
            })
          })
        },
        (cb) => {
          dagPB.util.cid(node1, (err, cid) => {
            expect(err).to.not.exist()

            dagPB.DAGNode.addLink(node3, {
              name: '1',
              size: node1.size,
              cid
            }, (err, node) => {
              expect(err).to.not.exist()
              node3 = node
              cb()
            })
          })
        },
        (cb) => {
          dagPB.util.cid(node2, (err, cid) => {
            expect(err).to.not.exist()

            dagPB.DAGNode.addLink(node3, {
              name: '2',
              size: node2.size,
              cid
            }, (err, node) => {
              expect(err).to.not.exist()
              node3 = node
              cb()
            })
          })
        }
      ], store)

      async function store () {
        const nodes = [node1, node2, node3]
        const result = resolver.put(nodes, multicodec.DAG_PB)
        ;[cid1, cid2, cid3] = await result.all()

        done()
      }
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const result = resolver.put([node1], multicodec.DAG_PB)
        const cid = await result.first()
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('dag-pb')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha2-256')
      })

      it('resolver.put with format + hashAlg', async () => {
        const result = resolver.put([node1], multicodec.DAG_PB, {
          hashAlg: multicodec.SHA3_512
        })
        const cid = await result.first()
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('dag-pb')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha3-512')
      })

      it('resolves a value within 1st node scope', async () => {
        const result = resolver.resolve(cid1, 'Data')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value).to.eql(Buffer.from('I am 1'))
      })

      it('resolves a value within nested scope (1 level)', async () => {
        const result = resolver.resolve(cid2, 'Links/0/Hash/Data')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('Data')
        expect(node1.value).to.eql(cid1.toV0())

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql(Buffer.from('I am 1'))
      })

      it('resolves value within nested scope (2 levels)', async () => {
        const result = resolver.resolve(cid3, 'Links/1/Hash/Links/0/Hash/Data')

        const node1 = await result.first()
        expect(node1.remainderPath).to.eql('Links/0/Hash/Data')
        expect(node1.value).to.eql(cid2.toV0())

        const node2 = await result.first()
        expect(node2.remainderPath).to.eql('Data')
        expect(node2.value).to.eql(cid1.toV0())

        const node3 = await result.first()
        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql(Buffer.from('I am 1'))
      })

      it('resolver.get round-trip', async () => {
        const resultPut = resolver.put([node1], multicodec.DAG_PB)
        const cid = await resultPut.first()
        const resultGet = resolver.get([cid])
        const node = await resultGet.first()
        // `size` is lazy, without a call to it a deep equal check would fail
        const _ = node.size // eslint-disable-line no-unused-vars
        expect(node).to.deep.equal(node1)
      })

      it('resolver.remove', async () => {
        // TODO vmx 2018-12-12: The same repo is used for all tests, there
        // seems to be some race condition with inserting and removing items.
        // Hence create a unique item for this test. Though the tests
        // should really be independent so that there are no race conditions.
        const createNode = new Promise((resolve, reject) => {
          const data = Buffer.from('a dag-pb node')
          dagPB.DAGNode.create(data, (err, node) => {
            if (err) {
              return reject(err)
            }
            return resolve(node)
          })
        })
        const node = await createNode
        const resultPut = resolver.put([node], multicodec.DAG_PB)
        const cid = await resultPut.first()
        const resultGet = resolver.get([cid])
        const sameAsNode = await resultGet.first()
        // `size` is lazy, without a call to it a deep equal check would fail
        const _ = sameAsNode.size // eslint-disable-line no-unused-vars
        expect(sameAsNode.data).to.deep.equal(node.data)
        return remove()

        async function remove () {
          const resultRemove = resolver.remove([cid])
          // The items are deleted through iteration
          await resultRemove.last()
          // Verify that the item got really deleted
          const resultGet = resolver.get([cid])
          await expect(resultGet.next()).to.eventually.be.rejected()
        }
      })
    })
  })
}
