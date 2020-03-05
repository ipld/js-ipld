<div align="center">
  <a href="https://ipld.io"><img src="https://ipld.io/img/ipld-logo.png" alt="IPLD hex logo" /></a>
</div>

# The JavaScript implementation of the IPLD

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-ipld-blue.svg?style=flat-square)](http://ipld.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![](https://img.shields.io/badge/pm-waffle-blue.svg?style=flat-square")](https://waffle.io/ipld/js-ipld)

[![Travis CI](https://flat.badgen.net/travis/ipld/js-ipld)](https://travis-ci.com/ipld/js-ipld)
[![Coverage Status](https://coveralls.io/repos/github/ipld/js-ipld/badge.svg?branch=master)](https://coveralls.io/github/ipld/js-ipld?branch=master)
[![Dependency Status](https://david-dm.org/ipld/js-ipld.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![Greenkeeper badge](https://badges.greenkeeper.io/ipld/js-ipld.svg)](https://greenkeeper.io/)

> The JavaScript implementation of the IPLD, InterPlanetary Linked-Data

## Project Status

This project is considered stable, but alpha quality implementation.  The IPLD strategy for persistence and integration with IPFS has evolved 
since this package was created.  This package will be deprecated once the new strategy is fully implemented.  You can read more about 
the new strategy in [Issue #260](https://github.com/ipld/js-ipld/issues/260)

[**IPLD Team Management**](https://github.com/ipld/team-mgmt)

## Tech Lead

[Volker Mische](https://github.com/vmx)

## Lead Maintainer

[Volker Mische](https://github.com/vmx)

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [IPLD constructor](#ipld-constructor)
      - [`options.blockService`](#optionsblockservice)
      - [`options.formats`](#optionsformats)
      - [`options.loadFormat(codec)`](#optionsloadformatcodec)
  - [`.put(node, format, options)`](#putnode-format-options)
  - [`.putMany(nodes, format, options)`](#putmanynode-format-options)
  - [`.resolve(cid, path)`](#resolvecid-path)
  - [`.get(cid)`](#getcid)
  - [`.getMany(cids)`](#getmanycids)
  - [`.remove(cid)`](#removecid)
  - [`.removeMany(cids)`](#removemanycids)
  - [`.tree(cid, [path], [options])`](#treecid-path-options)
  - [`.addFormat(ipldFormatImplementation)`](#addformatipldformatimplementation)
  - [`.removeFormat(codec)`](#removeformatcodec)
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

initIpld('/tmp/ipfsrepo', (err, ipld) => {
  // Do something with the `ipld`, e.g. `ipld.get(…)`
})
```

## API

The IPLD API works strictly with CIDs and deserialized IPLD Nodes. Interacting with the binary data happens on lower levels. To access the binary data directly, use the [Block API](https://github.com/ipfs/interface-ipfs-core/blob/master/SPEC/BLOCK.md).

All methods that return an async iterator return one that got extended with convenience methods:

  - `iter.first()`: Return the first item only
  - `iter.last()`: Return the last item only
  - `iter.all()`: Return all items as array

Example:

```js
const result = ipld.getMany([cid1, cid2])
const node1 = await result.first()
```

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

##### `options.loadFormat(codec)`

| Type | Default |
|------|---------|
| `async Function` | `null` |

Function to dynamically load an [IPLD Format](https://github.com/ipld/interface-ipld-format). It is passed a `codec`, the multicodec code of the IPLD format to load and returns an IPLD Format implementation. For example:

```js
const multicodec = require('multicodec')
const ipld = new Ipld({
  async loadFormat (codec) {
    if (codec === multicodec.GIT_RAW) {
      return require('ipld-git')
    } else {
      throw new Error('unable to load format ' + multicodec.print[codec])
    }
  }
})
```

### `.put(node, format, options)`

> Stores the given IPLD Node of a recognized IPLD Format.

 - `node` (`Object`): the deserialized IPLD node that should be inserted.
 - `format` (`multicodec`, required): the multicodec of the format that IPLD Node should be encoded in.
 - `options` is an object with the following properties:
   - `hashAlg` (`multicodec`, default: hash algorithm of the given multicodec): the hashing algorithm that is used to calculate the CID.
   - `cidVersion` (`number`, default: 1): the CID version to use.
   - `onlyHash` (`boolean`, default: false): if true the serialized form of the IPLD Node will not be passed to the underlying block store.

Returns a Promise with the CID of the serialized IPLD Node.


### `.putMany(nodes, format, options)`

> Stores the given IPLD Nodes of a recognized IPLD Format.

 - `nodes` (`AsyncIterable<Object>`): deserialized IPLD nodes that should be inserted.
 - `format` (`multicodec`, required): the multicodec of the format that IPLD Node should be encoded in.
 - `options` is applied to any of the `nodes` and is an object with the following properties:
   - `hashAlg` (`multicodec`, default: hash algorithm of the given multicodec): the hashing algorithm that is used to calculate the CID.
   - `cidVersion` (`number`, default: 1): the CID version to use.
   - `onlyHash` (`boolean`, default: false): if true the serialized form of the IPLD Node will not be passed to the underlying block store.

Returns an async iterator with the CIDs of the serialized IPLD Nodes. The iterator will throw an exception on the first error that occurs.


### `.resolve(cid, path)`

> Retrieves IPLD Nodes along the `path` that is rooted at `cid`.

 - `cid` (`CID`, required): the CID the resolving starts.
 - `path` (`IPLD Path`, required): the path that should be resolved.

Returns an async iterator of all the IPLD Nodes that were traversed during the path resolving. Every element is an object with these fields:
  - `remainderPath` (`string`): the part of the path that wasn’t resolved yet.
  - `value` (`*`): the value where the resolved path points to. If further traversing is possible, then the value is a CID object linking to another IPLD Node. If it was possible to fully resolve the path, `value` is the value the `path` points to. So if you need the CID of the IPLD Node you’re currently at, just take the `value` of the previously returned IPLD Node.


### `.get(cid)`

> Retrieve an IPLD Node.

 - `cid` (`CID`): the CID of the IPLD Node that should be retrieved.

Returns a Promise with the IPLD Node that correspond to the given `cid`.

Throws an error if the IPLD Node can’t be retrieved.


### `.getMany(cids)`

> Retrieve several IPLD Nodes at once.

 - `cids` (`AsyncIterable<CID>`): the CIDs of the IPLD Nodes that should be retrieved.

Returns an async iterator with the IPLD Nodes that correspond to the given `cids`.

Throws an error if a IPLD Node can’t be retrieved.


### `.remove(cid)`

> Remove an IPLD Node by the given `cid`

 - `cid` (`CID`): the CIDs of the IPLD Node that should be removed.

Throws an error if the IPLD Node can’t be removed.


### `.removeMany(cids)`

> Remove IPLD Nodes by the given `cids`

 - `cids` (`AsyncIterable<CID>`): the CIDs of the IPLD Nodes that should be removed.

Throws an error if any of the Blocks can’t be removed. This operation is not atomic, some Blocks might have already been removed.


### `.tree(cid, [path], [options])`

> Returns all the paths that can be resolved into.

 - `cid` (`CID`, required): the CID to get the paths from.
 - `path` (`IPLD Path`, default: ''): the path to start to retrieve the other paths from.
 - `options`:
   - `recursive` (`bool`, default: false): whether to get the paths recursively or not. `false` resolves only the paths of the given CID.

Returns an async iterator of all the paths (as Strings) you could resolve into.


### `.addFormat(ipldFormatImplementation)`

> Add support for an IPLD Format

 - `ipldFormatImplementation` (`IPLD Format`, required): the implementation of an IPLD Format.

Returns the IPLD instance. This way you can chain `addFormat()` calls.


### `.removeFormat(codec)`

> Remove support for an IPLD Format

 - `codec` (`multicodec`, required): the codec of the IPLD Format to remove.

Returns the IPLD instance. This way you can chain `removeFormat()` calls.


### Properties

#### `defaultOptions`

> Default options for IPLD.

## Packages

Listing of dependencies from the IPLD ecosystem.

> This table is generated using the module `package-table` with `package-table --data=package-list.json`.


| Package | Version | Deps | CI | Coverage | Lead Maintainer |
| ---------|---------|---------|---------|---------|--------- |
| **IPLD Formats** |
| [`ipld-bitcoin`](//github.com/ipld/js-ipld-bitcoin) | [![npm](https://img.shields.io/npm/v/ipld-bitcoin.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-bitcoin/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-bitcoin.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-bitcoin) | [![Travis CI](https://travis-ci.com/ipld/js-ipld-bitcoin.svg?branch=master)](https://travis-ci.com/ipld/js-ipld-bitcoin) | [![codecov](https://codecov.io/gh/ipld/js-ipld-bitcoin/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-bitcoin) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-dag-cbor`](//github.com/ipld/js-ipld-dag-cbor) | [![npm](https://img.shields.io/npm/v/ipld-dag-cbor.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-dag-cbor/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-dag-cbor.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-dag-cbor) | [![Travis CI](https://travis-ci.com/ipld/js-ipld-dag-cbor.svg?branch=master)](https://travis-ci.com/ipld/js-ipld-dag-cbor) | [![codecov](https://codecov.io/gh/ipld/js-ipld-dag-cbor/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-dag-cbor) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-dag-pb`](//github.com/ipld/js-ipld-dag-pb) | [![npm](https://img.shields.io/npm/v/ipld-dag-pb.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-dag-pb/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-dag-pb.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-dag-pb) | [![Travis CI](https://travis-ci.com/ipld/js-ipld-dag-pb.svg?branch=master)](https://travis-ci.com/ipld/js-ipld-dag-pb) | [![codecov](https://codecov.io/gh/ipld/js-ipld-dag-pb/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-dag-pb) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-ethereum`](//github.com/ipld/js-ipld-ethereum) | [![npm](https://img.shields.io/npm/v/ipld-ethereum.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-ethereum/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-ethereum.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-ethereum) | [![Travis CI](https://travis-ci.com/ipld/js-ipld-ethereum.svg?branch=master)](https://travis-ci.com/ipld/js-ipld-ethereum) | [![codecov](https://codecov.io/gh/ipld/js-ipld-ethereum/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-ethereum) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-git`](//github.com/ipld/js-ipld-git) | [![npm](https://img.shields.io/npm/v/ipld-git.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-git/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-git.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-git) | [![Travis CI](https://travis-ci.com/ipld/js-ipld-git.svg?branch=master)](https://travis-ci.com/ipld/js-ipld-git) | [![codecov](https://codecov.io/gh/ipld/js-ipld-git/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-git) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-raw`](//github.com/ipld/js-ipld-raw) | [![npm](https://img.shields.io/npm/v/ipld-raw.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-raw/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-raw.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-raw) | [![Travis CI](https://travis-ci.com/ipld/js-ipld-raw.svg?branch=master)](https://travis-ci.com/ipld/js-ipld-raw) | [![codecov](https://codecov.io/gh/ipld/js-ipld-raw/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-raw) | [Volker Mische](mailto:volker.mische@gmail.com) |
| [`ipld-zcash`](//github.com/ipld/js-ipld-zcash) | [![npm](https://img.shields.io/npm/v/ipld-zcash.svg?maxAge=86400&style=flat-square)](//github.com/ipld/js-ipld-zcash/releases) | [![Deps](https://david-dm.org/ipld/js-ipld-zcash.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-zcash) | [![Travis CI](https://travis-ci.com/ipld/js-ipld-zcash.svg?branch=master)](https://travis-ci.com/ipld/js-ipld-zcash) | [![codecov](https://codecov.io/gh/ipld/js-ipld-zcash/branch/master/graph/badge.svg)](https://codecov.io/gh/ipld/js-ipld-zcash) | [Volker Mische](mailto:volker.mische@gmail.com) |
| **Data Types (non IPLD specific)** |
| [`multihashes`](//github.com/multiformats/js-multihash) | [![npm](https://img.shields.io/npm/v/multihashes.svg?maxAge=86400&style=flat-square)](//github.com/multiformats/js-multihash/releases) | [![Deps](https://david-dm.org/multiformats/js-multihash.svg?style=flat-square)](https://david-dm.org/multiformats/js-multihash) | [![Travis CI](https://travis-ci.com/multiformats/js-multihash.svg?branch=master)](https://travis-ci.com/multiformats/js-multihash) | [![codecov](https://codecov.io/gh/multiformats/js-multihash/branch/master/graph/badge.svg)](https://codecov.io/gh/multiformats/js-multihash) | [David Dias](mailto:daviddias@ipfs.io) |
| [`ipfs-block`](//github.com/ipfs/js-ipfs-block) | [![npm](https://img.shields.io/npm/v/ipfs-block.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-block/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-block.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-block) | [![Travis CI](https://travis-ci.com/ipfs/js-ipfs-block.svg?branch=master)](https://travis-ci.com/ipfs/js-ipfs-block) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-block/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-block) | [Volker Mische](mailto:volker.mische@gmail.com) |
| **Storage** |
| [`ipfs-repo`](//github.com/ipfs/js-ipfs-repo) | [![npm](https://img.shields.io/npm/v/ipfs-repo.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-repo/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-repo.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-repo) | [![Travis CI](https://travis-ci.com/ipfs/js-ipfs-repo.svg?branch=master)](https://travis-ci.com/ipfs/js-ipfs-repo) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-repo/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-repo) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`interface-datastore`](//github.com/ipfs/interface-datastore) | [![npm](https://img.shields.io/npm/v/interface-datastore.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/interface-datastore/releases) | [![Deps](https://david-dm.org/ipfs/interface-datastore.svg?style=flat-square)](https://david-dm.org/ipfs/interface-datastore) | [![Travis CI](https://travis-ci.com/ipfs/interface-datastore.svg?branch=master)](https://travis-ci.com/ipfs/interface-datastore) | [![codecov](https://codecov.io/gh/ipfs/interface-datastore/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/interface-datastore) | [Pedro Teixeira](mailto:i@pgte.me) |
| [`ipfs-block-service`](//github.com/ipfs/js-ipfs-block-service) | [![npm](https://img.shields.io/npm/v/ipfs-block-service.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-ipfs-block-service/releases) | [![Deps](https://david-dm.org/ipfs/js-ipfs-block-service.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-block-service) | [![Travis CI](https://travis-ci.com/ipfs/js-ipfs-block-service.svg?branch=master)](https://travis-ci.com/ipfs/js-ipfs-block-service) | [![codecov](https://codecov.io/gh/ipfs/js-ipfs-block-service/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-block-service) | [Volker Mische](mailto:volker.mische@gmail.com) |

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipld/js-ipld-resolver/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
