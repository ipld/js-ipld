<div align="center">
  <a href="https://ipld.io"><img src="https://ipld.io/img/ipld-logo.png" alt="IPLD hex logo" /></a>
</div>

# The JavaScript implementation of the IPLD

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-ipld-blue.svg?style=flat-square)](http://ipld.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![](https://img.shields.io/badge/pm-waffle-blue.svg?style=flat-square")](https://waffle.io/ipld/js-ipld)

[![Coverage Status](https://coveralls.io/repos/github/ipld/js-ipld/badge.svg?branch=master)](https://coveralls.io/github/ipld/js-ipld?branch=master)
[![Dependency Status](https://david-dm.org/ipld/js-ipld.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

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
    - [Constructor](#ipld-constructor)
    - [`.put(node, options, callback)`](#putnode-options-callback)
    - [`.get(cid [, path] [, options], callback)`](#getcid--path--options-callback)
    - [`.getStream(cid [, path] [, options])`](#getstreamcid--path--options)
    - [`.treeStream(cid [, path] [, options])`](#treestreamcid--path--options)
    - [`.remove(cid, callback)`](#removecid-callback)
    - [`.support.add(multicodec, formatResolver, formatUtil)`](#supportaddmulticodec-formatresolver-formatutil)
    - [`.support.rm(multicodec)`](#supportrmmulticodec)
    - [Properties](#properties)
      - [`defaultOptions`](#defaultoptions)
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
      const ipld = new Ipld({blockService: blockService})
      return callback(null, ipld)
    })
  })
}

initIpld('/tmp/ifpsrepo', (err, ipld) => {
  // Do something with the `ipld`, e.g. `ipld.get(…)`
})
```

## API

The IPLD API works strictly with CIDs and deserialized IPLD Nodes. Interacting with the binary data happens on lower levels. To access the binary data directly, use the [Block API](https://github.com/ipfs/interface-ipfs-core/blob/master/SPEC/BLOCK.md).

### IPLD constructor

> Creates and returns an instance of IPLD.

```js
const ipld = new Ipld(options)
```

The `options` is an object with any of these properties:

##### `options.blockService`

| Type | Default |
|------|---------|
| [`ipfs.BlockService`](https://github.com/ipfs/js-ipfs-block-service) instance | Required (no default) |

Example:

```js
const blockService = new IpfsBlockService(repo)
const ipld = new Ipld({blockService: blockService})
```

##### `options.formats`

| Type | Default |
|------|---------|
| Array of [IPLD Format](https://github.com/ipld/interface-ipld-format) implementations | `[require('ipld-dag-cbor'), require('ipld-dag-pb'), require('ipld-raw')]` |

By default only the [dag-cbor](https://github.com/ipld/js-ipld-dag-cbor)), [dag-pb](https://github.com/ipld/js-ipld-dag-pb)) and [raw](https://github.com/ipld/js-ipld-raw)) IPLD Formats are supported. Other formats need to be added manually. Here is an example if you want to have support for [ipld-git](https://github.com/ipld/js-ipld-git) only:

```js
const ipldGit = require('ipld-git')

const ipld = new Ipld({
  formats: [ipldGit],
  …
})
```

##### `options.loadFormat(codec, callback)`

| Type | Default |
|------|---------|
| `Function` | `null` |

Function to dynamically load an [IPLD Format](https://github.com/ipld/interface-ipld-format). It is passed a string `codec`, the multicodec of the IPLD format to load and a callback function to call when the format has been loaded. e.g.

```js
const ipld = new Ipld({
  loadFormat (codec, callback) {
    if (codec === 'git-raw') {
      callback(null, require('ipld-git'))
    } else {
      callback(new Error('unable to load format ' + codec))
    }
  }
})
```

### `.put(nodes, options)`

> Stores the given IPLD Nodes of a recognized IPLD Format.

 - `cids` (`Iterable<Object>`): deserialized IPLD nodes that should be inserted.

 - `options` is applied to any of the `nodes` and is an object with the following properties:
   - `codec` (`multicodec`, required): the multicodec of the format that IPLD Node should be encoded in.
   - `hashCode` (`multicodec`, default: hash algorithm of the given multicodec): the hashing algorithm that is used to calculate the CID.
   - `version` (`boolean`, default: 1): the CID version to use.
   - `onlyHash` (`boolean`, default: false): if true the serialized form of the IPLD Node will not be passed to the underlying block store.

Returns an async iterator with the CIDs of the serialized IPLD Nodes.


### `.resolve(cid, path)`

> Retrieves IPLD Nodes along the `path` that is rooted at `cid`.

 - `cid` (`CID`, required): the CID the resolving starts.
 - `path` (`IPLD Path`, required): the path that should be resolved.

Returns an async iterator of all the IPLD Nodes that were traversed during the path resolving. Every element is an object with these fields:
  - `remainderPath` (`string`): the part of the path that wasn’t resolved yet.
  - `value` (`*`): the value where the resolved path points to. If further traversing is possible, then the value is a CID object linking to another IPLD Node. If it was possible to fully resolve the path, `value` is the value the `path` points to. So if you need the CID of the IPLD Node you’re currently at, just take the `value` of the previously returned IPLD Node.


### `.get(cids)`

> Retrieve several IPLD Nodes at once.

 - `cids` (`Iterable<CID>`): the CIDs of the IPLD Nodes that should be retrieved.

Returns an async iterator with the IPLD Nodes that correspond to the given `cids`.

Throws an error if a IPLD Node can’t be retrieved.

### `.remove(cids)`

> Remove IPLD Nodes by the given `cids`

 - `cids` (`Iterable<CID>`): the CIDs of the IPLD Nodes that should be retrieved.

Throws an error if any of the Blocks can’t be removed. This operation is not atomic, some Blocks might have already been removed.


### `.addFormat(ipldFormatImplementation)`

> Add support to another IPLD Format

 - `ipldFormatImplementation` (`IPLD Format`, required): the implementation of an IPLD Format.


### `.removeFormat(codec)`

> Removes support of an IPLD Format

 - `codec` (`multicodec`, required): the IPLD Format the should be removed.


### `.remove(cids)`

> Remove IPLD Nodes by the given `cids`

`cids` is an iterable — most often an array — with CIDs of the Blocks that should be removed.

Throws an error if any of the Blocks can’t be removed. This operation is not atomic, some Blocks might have already been removed.


### Properties

#### `defaultOptions`

> Default options for IPLD.

## Packages

Listing of dependencies from the IPLD ecosystem.

> This table is generated using the module `package-table` with `package-table --data=package-list.json`.


| Package | Version | Deps | CI | Coverage | Lead Maintainer |
| ---------|---------|---------|---------|---------|--------- |
| **IPLD Formats** |
| [`ipld-bitcoin`](//github.com/ipld/js-ipld-bitcoin) | [![npm](https://img.shields.io/npm/v/ipld-bitcoin.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-bitcoin/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-bitcoin.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-bitcoin) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-bitcoin/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-bitcoin/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-bitcoin/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-bitcoin) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-dag-cbor`](//github.com/ipld/js-ipld-dag-cbor) | [![npm](https://img.shields.io/npm/v/ipld-dag-cbor.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-dag-cbor/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-dag-cbor.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-dag-cbor) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-dag-cbor/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-dag-cbor/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-dag-cbor/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-dag-cbor) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-dag-pb`](//github.com/ipld/js-ipld-dag-pb) | [![npm](https://img.shields.io/npm/v/ipld-dag-pb.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-dag-pb/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-dag-pb.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-dag-pb) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-dag-pb/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-dag-pb/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-dag-pb/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-dag-pb) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-ethereum`](//github.com/ipld/js-ipld-ethereum) | [![npm](https://img.shields.io/npm/v/ipld-ethereum.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-ethereum/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-ethereum.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-ethereum) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-ethereum/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-ethereum/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-ethereum/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-ethereum) | [kumavis](mailto:aaron@kumavis.me) |
| [`ipld-git`](//github.com/ipld/js-ipld-git) | [![npm](https://img.shields.io/npm/v/ipld-git.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-git/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-git.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-git) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-git/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-git/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-git/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-git) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-raw`](//github.com/ipld/js-ipld-raw) | [![npm](https://img.shields.io/npm/v/ipld-raw.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-raw/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-raw.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-raw) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-raw/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-raw/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-raw/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-raw) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-zcash`](//github.com/ipld/js-ipld-zcash) | [![npm](https://img.shields.io/npm/v/ipld-zcash.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-zcash/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-zcash.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-zcash) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipld/js-ipld-zcash/master)](https://ci.ipfs.team/job/ipld/job/js-ipld-zcash/job/master/) | [![codecov](https://codecov.io/gh/ipld/js-ipld-zcash/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-zcash) | [Volker Mische](mailto:volker.mische@gmail.com) |
| **Data Types (non IPLD specific)** |
| [`multihashes`](//github.com/multiformats/js-multihash) | [![npm](https://img.shields.io/npm/v/multihashes.svg?maxAge=86400&style=flat-square)](//github.com/multiformats/js-multihash/releases) | [![Deps](https://david-dm.org/multiformats/js-multihash.svg?style=flat-square)](https://david-dm.org/multiformats/js-multihash) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=multiformats/js-multihash/master)](https://ci.ipfs.team/job/multiformats/job/js-multihash/job/master/) | [![codecov](https://codecov.io/gh/multiformats/js-multihash/branch/master/graph/badge.svg)](https://codecov.io/gh/multiformats/js-multihash) | [David Dias](mailto:daviddias@ipfs.io) |
| [`ipfs-block`](//github.com/ipfs/js-ipfs-block) | [![npm](https://img.shields.io/npm/v/ipfs-block.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-block/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-block.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-block) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/js-ipfs-block/master)](https://ci.ipfs.team/job/ipfs/job/js-ipfs-block/job/master/) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-block/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-block) | [Volker Mische](mailto:volker.mische@gmail.com) |
| **Storage** |
| [`ipfs-repo`](//github.com/ipfs/js-ipfs-repo) | [![npm](https://img.shields.io/npm/v/ipfs-repo.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-repo/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-repo.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-repo) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/js-ipfs-repo/master)](https://ci.ipfs.team/job/ipfs/job/js-ipfs-repo/job/master/) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-repo/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-repo) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`interface-datastore`](//github.com/ipfs/interface-datastore) | [![npm](https://img.shields.io/npm/v/interface-datastore.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/interface-datastore/releases) | [![Deps](https://david-dm.org/ipfs/interface-datastore.svg?style=flat-square)](https://david-dm.org/ipfs/interface-datastore) | N/A | [![codecov](https://codecov.io/gh/ipfs/interface-datastore/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/interface-datastore) | [Pedro Teixeira](mailto:i@pgte.me) |
| [`ipfs-block-service`](//github.com/ipfs/js-ipfs-block-service) | [![npm](https://img.shields.io/npm/v/ipfs-block-service.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-block-service/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-block-service.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-block-service) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=ipfs/js-ipfs-block-service/master)](https://ci.ipfs.team/job/ipfs/job/js-ipfs-block-service/job/master/) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-block-service/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-block-service) | [Volker Mische](mailto:volker.mische@gmail.com) |

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipld/js-ipld-resolver/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
