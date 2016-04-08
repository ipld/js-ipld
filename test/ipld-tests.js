/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-blocks').BlockService

const IPLDService = require('../src').IPLDService

module.exports = (repo) => {
  describe('js-ipld', () => {
    describe('IPLDService', () => {
      it('throws when not passed a repo', () => {
        expect(() => new IPLDService()).to.throw(/requires a BlockService/)
      })

      describe('.add', () => {
        const bs = new BlockService(repo)
        const ipldService = new IPLDService(bs)

        it('works', () => {
        })
      })
    })
  })
}
