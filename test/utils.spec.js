/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const utils = require('../src/utils')

describe('utils', () => {
  describe('.getKeys', () => {
    it('retrieves all nested keys', () => {
      expect(
        utils.getKeys({
          hello: 'world',
          l1: {'/': 'link-1'},
          nested: {
            l2: {'/': 'link-2'},
            even: {
              deeper: true,
              l3: {'/': 'link-3'}
            }
          }
        })
      ).to.be.eql(
        ['link-1', 'link-2', 'link-3']
      )
    })
  })
})
