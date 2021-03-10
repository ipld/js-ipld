/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const Block = require('ipld-block')
const ipldZcash = require('ipld-zcash')
const loadFixture = require('aegir/utils/fixtures')
const inMemory = require('ipld-in-memory')

const IPLDResolver = require('../src')

const BLOCK1_HEADER = loadFixture(
  'test/fixtures/000000000026fffdf2c88f2b98df7d23ef739c9dab619e3c050ab30283b3b958.bin'
).subarray(0, ipldZcash.util.ZCASH_BLOCK_HEADER_SIZE)
const BLOCK2_HEADER = loadFixture(
  'test/fixtures/00000000019e6de0fbc1bc402f70496e1d65d7ccd8e019853112efd5e2b6c409.bin'
).subarray(0, ipldZcash.util.ZCASH_BLOCK_HEADER_SIZE)
const BLOCK3_HEADER = loadFixture(
  'test/fixtures/0000000000751b170c51ae79dfbcf88f1fe93a5a78e83b4bed459f53a7e738a1.bin'
).subarray(0, ipldZcash.util.ZCASH_BLOCK_HEADER_SIZE)

describe('IPLD Resolver with ipld-zcash', () => {
  let resolver

  let cid1
  let cid2
  let cid3

  before(async () => {
    resolver = await inMemory(IPLDResolver, {
      formats: [ipldZcash]
    })

    // Put the fixtures directly into the repo as Zcash blocks currently
    // cannot be serialized
    cid1 = await ipldZcash.util.cid(BLOCK1_HEADER)
    await resolver.bs.put(new Block(BLOCK1_HEADER, cid1))
    cid2 = await ipldZcash.util.cid(BLOCK2_HEADER)
    await resolver.bs.put(new Block(BLOCK2_HEADER, cid2))
    cid3 = await ipldZcash.util.cid(BLOCK3_HEADER)
    await resolver.bs.put(new Block(BLOCK3_HEADER, cid3))
  })

  describe('public api', () => {
    // NOTE vmx 2019-10-29: There are no tests for putting Zcash blocks as
    // serializtion currently isn't supported

    it('resolves value within 1st node scope', async () => {
      const result = resolver.resolve(cid1, 'timestamp')
      const node = await result.first()
      expect(node.remainderPath).to.eql('')
      expect(node.value).to.eql(1565730024)
    })

    it('resolves value within nested scope (1 level)', async () => {
      const result = resolver.resolve(cid2, 'parent/timestamp')
      const [node1, node2] = await result.all()

      expect(node1.remainderPath).to.eql('timestamp')
      expect(node1.value).to.eql(cid1)

      expect(node2.remainderPath).to.eql('')
      expect(node2.value).to.eql(1565730024)
    })

    it('resolves value within nested scope (2 levels)', async () => {
      const result = resolver.resolve(cid3, 'parent/parent/timestamp')
      const [node1, node2, node3] = await result.all()

      expect(node1.remainderPath).to.eql('parent/timestamp')
      expect(node1.value).to.eql(cid2)

      expect(node2.remainderPath).to.eql('timestamp')
      expect(node2.value).to.eql(cid1)

      expect(node3.remainderPath).to.eql('')
      expect(node3.value).to.eql(1565730024)
    })

    it('resolver.remove', async () => {
      const expectedNode = ipldZcash.util.deserialize(BLOCK1_HEADER)
      const sameAsNode1 = await resolver.get(cid1)
      expect(sameAsNode1).to.deep.equal(expectedNode)

      await resolver.remove(cid1)
      // Verify that the item got really deleted
      await expect(resolver.get(cid1)).to.eventually.be.rejected()
    })
  })
})
