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
const multicodec = require('multicodec')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD format support', () => {
    let data, cid

    before(async () => {
      const bs = new BlockService(repo)
      const resolver = new IPLDResolver({ blockService: bs })

      data = { now: Date.now() }

      const result = resolver.put([data], multicodec.DAG_CBOR)
      cid = await result.last()
    })

    describe('Dynamic format loading', () => {
      it('should fail to dynamically load format', async () => {
        const bs = new BlockService(repo)
        const resolver = new IPLDResolver({
          blockService: bs,
          formats: []
        })

        const result = resolver.resolve(cid, '')
        await expect(result.next()).to.be.rejectedWith(
          'No resolver found for codec "dag-cbor"')
      })

      it('should fail to dynamically load format via loadFormat option', async () => {
        const errMsg = 'BOOM' + Date.now()
        const bs = new BlockService(repo)
        const resolver = new IPLDResolver({
          blockService: bs,
          formats: [],
          async loadFormat (codec) {
            if (codec !== multicodec.DAG_CBOR) {
              throw new Error('unexpected codec')
            }
            throw new Error(errMsg)
          }
        })

        const result = resolver.resolve(cid, '')
        await expect(result.next()).to.be.rejectedWith(errMsg)
      })

      it('should dynamically load missing format', async () => {
        const bs = new BlockService(repo)
        const resolver = new IPLDResolver({
          blockService: bs,
          formats: [],
          async loadFormat (codec) {
            if (codec !== multicodec.DAG_CBOR) {
              throw new Error('unexpected codec')
            }
            return dagCBOR
          }
        })

        const result = resolver.resolve(cid, '')
        const node = await result.first()
        expect(node.value).to.eql(data)
      })

      it('should not dynamically load format added statically', async () => {
        const bs = new BlockService(repo)
        const resolver = new IPLDResolver({
          blockService: bs,
          formats: [dagCBOR],
          loadFormat (codec) {
            throw new Error(`unexpected load format ${codec}`)
          }
        })

        const result = resolver.resolve(cid, '')
        await result.next()
      })
    })
  })
}
