/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const dagCBOR = require('ipld-dag-cbor')
const multicodec = require('multicodec')
const inMemory = require('ipld-in-memory')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('IPLD format support', () => {
    let data, cid

    before(async () => {
      const resolver = await inMemory(IPLDResolver)

      data = { now: Date.now() }

      cid = await resolver.put(data, multicodec.DAG_CBOR)
    })

    describe('Dynamic format loading', () => {
      it('should fail to dynamically load format', async () => {
        const resolver = await inMemory(IPLDResolver, {
          formats: []
        })

        const result = resolver.resolve(cid, '')
        await expect(result.next()).to.be.rejectedWith(
          'No resolver found for codec "dag-cbor"')
      })

      it('should fail to dynamically load format via loadFormat option', async () => {
        const errMsg = 'BOOM' + Date.now()
        const resolver = await inMemory(IPLDResolver, {
          formats: [],
          loadFormat (codec) {
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
        const resolver = await inMemory(IPLDResolver, {
          formats: [],
          loadFormat (codec) {
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
        const resolver = await inMemory(IPLDResolver, {
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
