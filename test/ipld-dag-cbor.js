/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const chaiAsProised = require('chai-as-promised')
const expect = chai.expect
chai.use(dirtyChai)
chai.use(chaiAsProised)
const BlockService = require('ipfs-block-service')
const dagCBOR = require('ipld-dag-cbor')
const series = require('async/series')
const multicodec = require('multicodec')
const multihash = require('multihashes')

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

      resolver = new IPLDResolver({ blockService: bs })

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
            one: cid1
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
            one: cid1,
            two: cid2
          }

          dagCBOR.util.cid(node3, (err, cid) => {
            expect(err).to.not.exist()
            cid3 = cid
            cb()
          })
        }
      ], store)

      async function store () {
        const nodes = [node1, node2, node3]
        const result = resolver.putMany(nodes, multicodec.DAG_CBOR)
        ;[cid1, cid2, cid3] = await result.all()

        done()
      }
    })

    describe('public api', () => {
      it('resolver.put with format', async () => {
        const cid = await resolver.put(node1, multicodec.DAG_CBOR)
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('dag-cbor')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha2-256')
      })

      it('resolver.put with format + hashAlg', async () => {
        const cid = await resolver.put(node1, multicodec.DAG_CBOR, {
          hashAlg: multicodec.SHA3_512
        })
        expect(cid).to.exist()
        expect(cid.version).to.equal(1)
        expect(cid.codec).to.equal('dag-cbor')
        expect(cid.multihash).to.exist()
        const mh = multihash.decode(cid.multihash)
        expect(mh.name).to.equal('sha3-512')
      })

      it('resolves value within 1st node scope', async () => {
        const result = resolver.resolve(cid1, 'someData')
        const node = await result.first()
        expect(node.remainderPath).to.eql('')
        expect(node.value).to.eql('I am 1')
      })

      it('resolves value within nested scope (0 level)', async () => {
        const result = resolver.resolve(cid2, 'one')
        const [node1, node2] = await result.all()

        expect(node1.remainderPath).to.eql('')
        expect(node1.value).to.eql(cid1)

        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql({ someData: 'I am 1' })
      })

      it('resolves value within nested scope (1 level)', async () => {
        const result = resolver.resolve(cid2, 'one/someData')
        const [node1, node2] = await result.all()

        expect(node1.remainderPath).to.eql('someData')
        expect(node1.value).to.eql(cid1)

        expect(node2.remainderPath).to.eql('')
        expect(node2.value).to.eql('I am 1')
      })

      it('resolves value within nested scope (2 levels)', async () => {
        const result = resolver.resolve(cid3, 'two/one/someData')
        const [node1, node2, node3] = await result.all()

        expect(node1.remainderPath).to.eql('one/someData')
        expect(node1.value).to.eql(cid2)

        expect(node2.remainderPath).to.eql('someData')
        expect(node2.value).to.eql(cid1)

        expect(node3.remainderPath).to.eql('')
        expect(node3.value).to.eql('I am 1')
      })

      it('fails resolving unavailable path', async () => {
        const result = resolver.resolve(cid3, `foo/${Date.now()}`)
        await expect(result.next()).to.be.rejectedWith(
          'path not available at root')
      })

      it('resolver.get round-trip', async () => {
        const cid = await resolver.put(node1, multicodec.DAG_CBOR)
        const node = await resolver.get(cid)
        expect(node).to.deep.equal(node1)
      })

      it('resolver.tree', async () => {
        const result = resolver.tree(cid3)
        const paths = await result.all()
        expect(paths).to.eql([
          'one',
          'two',
          'someData'
        ])
      })

      it('resolver.tree with exist()ent path', async () => {
        const result = resolver.tree(cid3, 'one')
        const paths = await result.all()
        expect(paths).to.eql([])
      })

      it('resolver.tree with non exist()ent path', async () => {
        const result = resolver.tree(cid3, 'bananas')
        const paths = await result.all()
        expect(paths).to.eql([])
      })

      it('resolver.tree recursive', async () => {
        const result = resolver.tree(cid3, { recursive: true })
        const paths = await result.all()
        expect(paths).to.eql([
          'one',
          'two',
          'someData',
          'one/someData',
          'two/one',
          'two/someData',
          'two/one/someData'
        ])
      })

      it('resolver.tree with exist()ent path recursive', async () => {
        const result = resolver.tree(cid3, 'two', { recursive: true })
        const paths = await result.all()
        expect(paths).to.eql([
          'one',
          'someData',
          'one/someData'
        ])
      })

      it('resolver.remove', async () => {
        const cid = await resolver.put(node1, multicodec.DAG_CBOR)
        const sameAsNode1 = await resolver.get(cid)
        expect(sameAsNode1).to.deep.equal(node1)
        return remove()

        async function remove () {
          await resolver.remove(cid)
          // Verify that the item got really deleted
          await expect(resolver.get(cid)).to.eventually.be.rejected()
        }
      })
    })
  })
}
