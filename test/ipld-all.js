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

describe('IPLD Resolver for dag-cbor + dag-pb', () => {
  let resolver

  let nodeCbor
  let nodePb
  let cidCbor
  let cidPb

  before((done) => {
    resolver = new IPLDResolver()

    series([
      (cb) => {
        dagPB.DAGNode.create(new Buffer('I am inside a Protobuf'), (err, node) => {
          expect(err).to.not.exist
          nodePb = node
          cb()
        })
      },
      (cb) => {
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
        pull.asyncMap((nac, cb) => resolver.put(nac.node, { cid: nac.cid }, cb)),
        pull.onEnd(done)
      )
    }
  })

  it('resolve through different formats', (done) => {
    resolver.get(cidCbor, 'pb/Data', (err, result) => {
      expect(err).to.not.exist
      expect(result.value).to.eql(new Buffer('I am inside a Protobuf'))
      done()
    })
  })
})

