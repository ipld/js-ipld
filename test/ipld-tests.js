/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-blocks').BlockService
const ipld = require('ipld')
const multihash = require('multihashing')

const IPLDService = require('../src').IPLDService

module.exports = (repo) => {
  describe('js-ipld', () => {
    describe('IPLDService', () => {
      let bs
      let ipldService

      before(() => {
        bs = new BlockService(repo)
        ipldService = new IPLDService(bs)
      })

      it('throws when not passed a repo', () => {
        expect(() => new IPLDService()).to.throw(/requires a BlockService/)
      })

      it('adds an ipld node', (done) => {
        const node = {
          name: 'hello.txt',
          size: 11
        }

        ipldService.add(node, (err) => {
          expect(err).to.not.exist
          done()
        })
      })

      it('gets an ipld node', (done) => {
        const node = {
          name: 'world.txt',
          size: 11
        }

        ipldService.add(node, (err) => {
          expect(err).to.not.exist

          const mh = multihash(ipld.marshal(node), 'sha2-256')

          ipldService.get(mh, (err, fetchedNode) => {
            expect(err).to.not.exist
            expect(node).to.deep.equal(fetchedNode)
            done()
          })
        })
      })
    })
  })
}
