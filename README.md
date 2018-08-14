<div align="center">
  <a href="https://ipld.io"><img src="https://ipld.io/img/ipld-logo.png" alt="IPLD hex logo" /></a>
</div>

# The JavaScript implementation of the IPLD

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-ipld-blue.svg?style=flat-square)](http://ipld.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![](https://img.shields.io/badge/pm-waffle-blue.svg?style=flat-square")](https://waffle.io/ipld/js-ipld)

[![Travis CI](https://travis-ci.org/ipld/js-ipld.svg?branch=master)](https://travis-ci.org/ipld/js-ipld)
[![Circle CI](https://circleci.com/gh/ipld/js-ipld.svg?style=svg)]("https://circleci.com/gh/ipld/js-ipld)
[![Coverage Status](https://coveralls.io/repos/github/ipld/js-ipld/badge.svg?branch=master)](https://coveralls.io/github/ipld/js-ipld?branch=master)
[![Dependency Status](https://david-dm.org/ipld/js-ipld.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square)

> The JavaScript implementation of the IPLD, InterPlanetary Linked-Data

## Project Status

We've come a long way, but this project is still in Alpha, lots of development is happening, API might change, beware of the Dragons 🐉.

Want to get started? Check our examples folder. You can check the development status at the [js-ipld Waffle Board](https://waffle.io/ipld/js-ipld).

[![Throughput Graph](https://graphs.waffle.io/ipld/js-ipld/throughput.svg)](https://waffle.io/ipld/js-ipld/metrics/throughput)

[**`Weekly Core Dev Calls`**](https://github.com/ipfs/pm/issues/650)

## Tech Lead

[Volker Mische](https://github.com/vmx)

## Lead Maintainer

[Volker Mische](https://github.com/vmx)

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - IPLD Resolver
    - [`.put(node, options, callback)`](#putnode-options-callback)
    - [`.get(cid [, path] [, options], callback)`](#getcid--path--options-callback)
    - [`.getStream(cid [, path] [, options])`](#getstreamcid--path--options)
    - [`.treeStream(cid [, path] [, options])`](#treestreamcid--path--options)
    - [`.remove(cid, callback)`](#removecid-callback)
    - [`.support.add(multicodec, formatResolver, formatUtil)`](#supportaddmulticodec-formatresolver-formatutil)
    - [`.support.rm(multicodec)`](#supportrmmulticodec)
- [Packages](#packages)
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
> npm install --save ipld
```

## Usage

```js
const Ipld = require('ipld')
const IpfsRepo = require('ipfs-repo')
const IpfsBlockService = require('ipfs-block-service')

const initIpld = (ipfsRepoPath, callback) => {
  const repo = new IpfsRepo(ipfsRepoPath)
  repo.init({}, (err) => {
    if (err) {
      return callback(err)
    }
    repo.open((err) => {
      if (err) {
        return callback(err)
      }
      const blockService = new IpfsBlockService(repo)
      const ipld = new Ipld(blockService)
      return callback(null, ipld)
    })
  })
}

initIpld('/tmp/ifpsrepo', (err, ipld) => {
  // Do something with the `ipld`, e.g. `ipld.get(…)`
})
```

## API

### `.put(node, options, callback)`

> Store the given node of a recognized IPLD Format.

`options` is an object that must contain one of the following combinations:
- `cid` - the CID of the node
- `[hashAlg]`, `[version]` and `format` - the hashAlg, version and the format that should be used to create the CID of the node. The 
`hashAlg` and `version` defaults to the default values for the `format`.

`callback` is a function that should have the signature as following: `function (err, cid) {}`, where `err` is an Error object in case of error and `cid` is the cid of the stored object.

### `.get(cid [, path] [, options], callback)`

> Retrieve a node by the given `cid` or `cid + path`

`options` is an optional object containing:

- `localResolve: bool` - if true, get will only attempt to resolve the path locally

`callback` should be a function with the signature `function (err, result)`, the result being an object with:

- `value` - the value that resulted from the get
- `remainderPath` - If it didn't manage to successfully resolve the whole path through or if simply the `localResolve` option was passed.

### `.getStream(cid [, path] [, options])`

> Same as get, but returns a source pull-stream that is used to pass the fetched node.

### `.treeStream(cid [, path] [, options])`

> Returns all the paths under a cid + path through a pull-stream. Accepts the following options:

- `recursive` - bool - traverse through links to complete the graph.

### `.remove(cid, callback)`

> Remove a node by the given `cid`

### `.support.add(multicodec, formatResolver, formatUtil)`

> Add support to another IPLD Format

### `.support.rm(multicodec)`

> Removes support of an IPLD Format

## Packages

Listing of dependencies from the IPFS ecosystem.

<!---
This table is generated from the script located in `scripts/generate-package-table-for-readme.js`
Please use the same script if you need to update this table.
-->
| Package | Version | Deps | CI | Coverage |
| ---------|---------|---------|---------|--------- |
| **IPLD Formats** |
| [`ipld-bitcoin`](//github.com/ipld/js-ipld-bitcoin) | [![npm](https://img.shields.io/npm/v/ipld-bitcoin.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-bitcoin/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-bitcoin.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-bitcoin) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-bitcoin/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-bitcoin/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-bitcoin/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-bitcoin) |
| [`ipld-dag-cbor`](//github.com/ipld/js-ipld-dag-cbor) | [![npm](https://img.shields.io/npm/v/ipld-dag-cbor.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-dag-cbor/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-dag-cbor.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-dag-cbor) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-dag-cbor/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-dag-cbor/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-dag-cbor/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-dag-cbor) |
| [`ipld-dag-pb`](//github.com/ipld/js-ipld-dag-pb) | [![npm](https://img.shields.io/npm/v/ipld-dag-pb.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-dag-pb/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-dag-pb.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-dag-pb) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-dag-pb/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-dag-pb/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-dag-pb/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-dag-pb) |
| [`ipld-ethereum`](//github.com/ipld/js-ipld-ethereum) | [![npm](https://img.shields.io/npm/v/ipld-ethereum.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-ethereum/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-ethereum.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-ethereum) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-ethereum/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-ethereum/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-ethereum/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-ethereum) |
| [`ipld-git`](//github.com/ipld/js-ipld-git) | [![npm](https://img.shields.io/npm/v/ipld-git.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-git/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-git.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-git) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-git/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-git/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-git/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-git) |
| [`ipld-raw`](//github.com/ipld/js-ipld-raw) | [![npm](https://img.shields.io/npm/v/ipld-raw.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-raw/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-raw.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-raw) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-raw/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-raw/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-raw/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-raw) |
| [`ipld-zcash`](//github.com/ipld/js-ipld-zcash) | [![npm](https://img.shields.io/npm/v/ipld-zcash.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-zcash/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-zcash.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-zcash) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-zcash/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-zcash/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-zcash/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-zcash) |
| **Storage** |
| [`multihashes`](//github.com/multiformats/js-multihash) | [![npm](https://img.shields.io/npm/v/multihashes.svg?maxAge=86400&style=flat-square)](//github.com/multiformats/js-multihash/releases) | [![Deps](https://david-dm.org/multiformats/js-multihash.svg?style=flat-square)](https://david-dm.org/multiformats/js-multihash) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=multiformats/js-multihash/master)](https://ci.ipfs.team/job/multiformats/job/js-multihash/job/master/) | [![codecov](https://codecov.io/gh/multiformats/js-multihash/branch/master/graph/badge.svg)](https://codecov.io/gh/multiformats/js-multihash) |
| [`ipfs-block`](//github.com/ipfs/js-ipfs-block) | [![npm](https://img.shields.io/npm/v/ipfs-block.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-block/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-block.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-block) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/js-ipfs-block/master)](https://ci.ipfs.team/job/ipfs/job/js-ipfs-block/job/master/) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-block/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-block) |
| [`ipfs-repo`](//github.com/ipfs/js-ipfs-repo) | [![npm](https://img.shields.io/npm/v/ipfs-repo.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-repo/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-repo.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-repo) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/js-ipfs-repo/master)](https://ci.ipfs.team/job/ipfs/job/js-ipfs-repo/job/master/) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-repo/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-repo) |
| [`interface-datastore`](//github.com/ipfs/interface-datastore) | [![npm](https://img.shields.io/npm/v/interface-datastore.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/interface-datastore/releases) | [![Deps](https://david-dm.org/ipfs/interface-datastore.svg?style=flat-square)](https://david-dm.org/ipfs/interface-datastore) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/interface-datastore/master)](https://ci.ipfs.team/job/ipfs/job/interface-datastore/job/master/) | [![codecov](https://codecov.io/gh/ipfs/interface-datastore/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/interface-datastore) |
| **Exchange** |
| [`ipfs-block-service`](//github.com/ipfs/js-ipfs-block-service) | [![npm](https://img.shields.io/npm/v/ipfs-block-service.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-block-service/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-block-service.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-block-service) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/js-ipfs-block-service/master)](https://ci.ipfs.team/job/ipfs/job/js-ipfs-block-service/job/master/) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-block-service/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-block-service) |
| **Generics/Utils** |
| [`is-ipfs`](//github.com/ipfs/is-ipfs) | [![npm](https://img.shields.io/npm/v/is-ipfs.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/is-ipfs/releases) | [![Deps](https://david-dm.org/ipfs/is-ipfs.svg?style=flat-square)](https://david-dm.org/ipfs/is-ipfs) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/is-ipfs/master)](https://ci.ipfs.team/job/ipfs/job/is-ipfs/job/master/) | [![codecov](https://codecov.io/gh/ipfs/is-ipfs/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/is-ipfs) |

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipld/js-ipld-resolver/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
