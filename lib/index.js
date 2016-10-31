'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Block = require('ipfs-block');
var pull = require('pull-stream');
var CID = require('cids');
var until = require('async/until');
var IPFSRepo = require('ipfs-repo');
var MemoryStore = require('interface-pull-blob-store');
var BlockService = require('ipfs-block-service');

var dagPB = require('ipld-dag-pb');
var dagCBOR = require('ipld-dag-cbor');

var IPLDResolver = function () {
  function IPLDResolver(blockService) {
    var _this = this;

    _classCallCheck(this, IPLDResolver);

    // nicola will love this!
    if (!blockService) {
      var repo = new IPFSRepo('in-memory', { stores: MemoryStore });
      blockService = new BlockService(repo);
    }

    this.bs = blockService;
    this.resolvers = {};

    this.support = {};

    // Adds support for an IPLD format
    this.support.add = function (multicodec, resolver, util) {
      if (_this.resolvers[multicodec]) {
        throw new Error(multicodec + 'already supported');
      }

      _this.resolvers[multicodec] = {
        resolver: resolver,
        util: util
      };
    };

    this.support.rm = function (multicodec) {
      if (_this.resolvers[multicodec]) {
        delete _this.resolvers[multicodec];
      }
    };

    // Support by default dag-pb and dag-cbor
    this.support.add(dagPB.resolver.multicodec, dagPB.resolver, dagPB.util);
    this.support.add(dagCBOR.resolver.multicodec, dagCBOR.resolver, dagCBOR.util);
  }

  _createClass(IPLDResolver, [{
    key: 'resolve',
    value: function resolve(cid, path, callback) {
      var _this2 = this;

      if (path === '/') {
        return this.get(cid, callback);
      }

      var value = void 0;

      until(function () {
        if (!path || path === '' || path === '/') {
          return true;
        } else {
          // continue traversing
          if (value) {
            cid = new CID(value['/']);
          }
          return false;
        }
      }, function (cb) {
        // get block
        // use local resolver
        // update path value
        _this2.bs.get(cid, function (err, block) {
          if (err) {
            return cb(err);
          }
          var r = _this2.resolvers[cid.codec];
          r.resolver.resolve(block, path, function (err, result) {
            if (err) {
              return cb(err);
            }
            value = result.value;
            path = result.remainderPath;
            cb();
          });
        });
      }, function (err, results) {
        if (err) {
          return callback(err);
        }
        return callback(null, value);
      });
    }

    // Node operations (get and retrieve nodes, not values)

  }, {
    key: 'put',
    value: function put(nodeAndCID, callback) {
      callback = callback || noop;
      pull(pull.values([nodeAndCID]), this.putStream(callback));
    }
  }, {
    key: 'putStream',
    value: function putStream(callback) {
      var _this3 = this;

      callback = callback || noop;

      return pull(pull.asyncMap(function (nodeAndCID, cb) {
        var cid = nodeAndCID.cid;
        var r = _this3.resolvers[cid.codec];

        r.util.serialize(nodeAndCID.node, function (err, serialized) {
          if (err) {
            return cb(err);
          }
          cb(null, {
            block: new Block(serialized),
            cid: cid
          });
        });
      }), this.bs.putStream(), pull.onEnd(callback));
    }
  }, {
    key: 'get',
    value: function get(cid, callback) {
      pull(this.getStream(cid), pull.collect(function (err, res) {
        if (err) {
          return callback(err);
        }
        callback(null, res[0]);
      }));
    }
  }, {
    key: 'getStream',
    value: function getStream(cid) {
      var _this4 = this;

      return pull(this.bs.getStream(cid), pull.asyncMap(function (block, cb) {
        var r = _this4.resolvers[cid.codec];
        if (r) {
          r.util.deserialize(block.data, function (err, deserialized) {
            if (err) {
              return cb(err);
            }
            cb(null, deserialized);
          });
        } else {
          // multicodec unknown, send back raw data
          cb(null, block.data);
        }
      }));
    }
  }, {
    key: 'remove',
    value: function remove(cids, callback) {
      this.bs.delete(cids, callback);
    }
  }]);

  return IPLDResolver;
}();

function noop() {}

module.exports = IPLDResolver;