/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const IpfsBlock = require('ipfs-block')
const CID = require('cids')
const ipldBin = require('../src/ipldBin')

module.exports = () => {
  describe('IPLD Resolver with ipld-bin (binary resolver)', () => {
    it('resolves an ipfsBlock to its data', (done) => {
      const buffer = Buffer.from('deadbeef', 'hex')
      const cid = new CID('zDvjKAA4iXx')
      const ipfsBlock = new IpfsBlock(buffer, cid)
      ipldBin.resolver.resolve(ipfsBlock, '/hello/world', (err, result) => {
        expect(err).to.not.exist()
        expect(result).to.exist()
        expect(Buffer.isBuffer(result.value)).to.be.true()
        expect(result.value.toString('hex')).to.be.eql('deadbeef')
        expect(result.remainderPath).to.be.eql('/hello/world')
        done()
      })
    })

    it('trees an empty array', (done) => {
      const buffer = Buffer.from('deadbeef', 'hex')
      const cid = new CID('zDvjKAA4iXx')
      const ipfsBlock = new IpfsBlock(buffer, cid)
      ipldBin.resolver.tree(ipfsBlock, {}, (err, result) => {
        expect(err).to.not.exist()
        expect(result).to.exist()
        expect(result.length).to.eql(0)
        done()
      })
    })

    it('creates a cid with the currect multicodec', (done) => {
      const buffer = Buffer.from('deadbeef', 'hex')
      // const cid = new CID('zDvjKAA4iXx')
      // const ipfsBlock = new IpfsBlock(buffer, cid)
      ipldBin.util.cid(buffer, (err, cid) => {
        expect(err).to.not.exist()
        expect(cid).to.exist()
        expect(cid.codec).to.eql('base2')
        done()
      })
    })

    it('serializes to the same value', (done) => {
      const buffer = Buffer.from('deadbeef', 'hex')
      // const cid = new CID('zDvjKAA4iXx')
      // const ipfsBlock = new IpfsBlock(buffer, cid)
      ipldBin.util.serialize(buffer, (err, result) => {
        expect(err).to.not.exist()
        expect(result).to.exist()
        expect(result.toString('hex')).to.eql(buffer.toString('hex'))
        done()
      })
    })

    it('deserializes to the same value', (done) => {
      const buffer = Buffer.from('deadbeef', 'hex')
      // const cid = new CID('zDvjKAA4iXx')
      // const ipfsBlock = new IpfsBlock(buffer, cid)
      ipldBin.util.deserialize(buffer, (err, result) => {
        expect(err).to.not.exist()
        expect(result).to.exist()
        expect(result.toString('hex')).to.eql(buffer.toString('hex'))
        done()
      })
    })
  })
}
