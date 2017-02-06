const expect = require('chai').expect
const series = require('async/series')
const dagPB = require('ipld-dag-pb')
const ipldEthBlock = require('ipld-eth-block')
const EthBlockHeader = require('ethereumjs-block/header')
const dagCBOR = require('ipld-dag-cbor')
const pull = require('pull-stream')

exports.createPB = function createPB (resolver, done) {
  // equivalent of:
  // node1 = {"data": "I am 1"}
  // node2 = {
  //   "data": "I am 2",
  //   "links": [{"/": node1}]
  // }

  let node1
  let node2
  let cid1
  let cid2

  series([
    // create node1
    (cb) => {
      dagPB.DAGNode.create(new Buffer('I am 1'), (err, node) => {
        expect(err).to.not.exist
        node1 = node
        cb()
      })
    },
    // create node2
    (cb) => {
      dagPB.DAGNode.create(new Buffer('I am 2'), (err, node) => {
        expect(err).to.not.exist
        node2 = node
        cb()
      })
    },
    // adding link to node2
    (cb) => {
      dagPB.DAGNode.addLink(node2, {
        name: '1',
        size: node1.size,
        multihash: node1.multihash
      }, (err, node) => {
        expect(err).to.not.exist
        node2 = node
        cb()
      })
    },
    // generating cid for node1
    (cb) => {
      dagPB.util.cid(node1, (err, cid) => {
        expect(err).to.not.exist
        cid1 = cid
        cb()
      })
    },
    // generating cid for node2
    (cb) => {
      dagPB.util.cid(node2, (err, cid) => {
        expect(err).to.not.exist
        cid2 = cid
        cb()
      })
    },
    (cb) => {
      pull(
        pull.values([
          { node: node1, cid: cid1 },
          { node: node2, cid: cid2 }
        ]),
        resolver.putStream(cb)
      )
    }
  ], (err) => {
    expect(err).to.not.exist
    done(cid2)
  })
}

exports.createEthBlock = function createEthBlock (resolver, done) {
  let node1
  let node2
  let cid1
  let cid2

  series([
    (cb) => {
      node1 = new EthBlockHeader({
        number: 1
      })

      ipldEthBlock.util.cid(node1, (err, cid) => {
        expect(err).to.not.exist
        cid1 = cid
        cb()
      })
    },
    (cb) => {
      node2 = new EthBlockHeader({
        number: 2,
        parentHash: node1.hash()
      })

      ipldEthBlock.util.cid(node2, (err, cid) => {
        expect(err).to.not.exist
        cid2 = cid
        cb()
      })
    },
    (cb) => {
      pull(
        pull.values([
          { node: node1, cid: cid1 },
          { node: node2, cid: cid2 }
        ]),
        resolver.putStream(cb)
      )
    }
  ], (err) => {
    expect(err).to.not.exist
    done(cid2)
  })
}

exports.createCBOR = function createCBOR (resolver, done) {
  let node1
  let node2
  let cid1
  let cid2

  series([
    (cb) => {
      node1 = {
        someData: 'I am 1'
      }

      dagCBOR.util.cid(node1, (err, cid) => {
        expect(err).to.not.exist
        cid1 = cid
        cb()
      })
    },
    (cb) => {
      node2 = {
        someData: 'I am 2',
        one: { '/': cid1.toBaseEncodedString() }
      }

      dagCBOR.util.cid(node2, (err, cid) => {
        expect(err).to.not.exist
        cid2 = cid
        cb()
      })
    },
    (cb) => {
      pull(
        pull.values([
          { node: node1, cid: cid1 },
          { node: node2, cid: cid2 }
        ]),
        resolver.putStream(done)
      )
    }
  ], (err) => {
    expect(err).to.not.exist
    done(cid2)
  })
}
