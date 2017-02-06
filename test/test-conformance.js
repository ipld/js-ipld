/* eslint-env mocha */
'use strict'

/*
 * Test resolver for different types of data structures
 */

const expect = require('chai').expect
const series = require('async/series')
const testData = require('./conformance-utils')

const IPLDResolver = require('../src')

describe('IPLD Path Resolver conformance tests', () => {
  let resolver
  let pbCid
  let cborCid
  let ethCid

  before((done) => {
    resolver = new IPLDResolver()

    series([
      (cb) => testData.createPB(resolver, (cid) => {
        pbCid = cid
        cb()
      }),
      (cb) => testData.createCBOR(resolver, (cid) => {
        cborCid = cid
        cb()
      }),
      (cb) => testData.createEthBlock(resolver, (cid) => {
        ethCid = cid
        cb()
      })
    ], done)
  })
})
