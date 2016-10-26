/* eslint-env mocha */
'use strict'

/*
 * Test different types of data structures living together
 * &
 * Test data made of mixed data structures!
 */

const expect = require('chai').expect
const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')
const series = require('async/series')
const pull = require('pull-stream')

const IPLDResolver = require('../src')

describe('IPLD Path Resolver for dag-cbor', () => {
  let resolver

  let nodeCbor
  let nodePb
  let cidCbor
  let cidPb

  before((done) => {
    resolver = new IPLDResolver()

    series([
      (cb) => {
        nodePb = new dagPB.DAGNode(new Buffer('I am inside a Protobuf'))

        dagPB.util.cid(nodePb, (err, cid) => {
          expect(err).to.not.exist
          cidPb = cid
          cb()
        })
      },
      (cb) => {
        nodeCbor = {
          someData: 'I am inside a Cbor object',
          pb: { '/': cidPb.toBaseEncodedString() }
        }

        dagCBOR.util.cid(nodeCbor, (err, cid) => {
          expect(err).to.not.exist
          cidCbor = cid
          cb()
        })
      }
    ], store)

    function store () {
      pull(
        pull.values([
          { node: nodePb, cid: cidPb },
          { node: nodeCbor, cid: cidCbor }
        ]),
        resolver.putStream(done)
      )
    }
  })

  it('resolve through different formats', (done) => {
    resolver.resolve(cidCbor, 'pb/data', (err, result) => {
      expect(err).to.not.exist
      expect(result).to.eql(new Buffer('I am inside a Protobuf'))
      done()
    })
  })
})

