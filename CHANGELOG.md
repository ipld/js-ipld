<a name="0.25.5"></a>
## [0.25.5](https://github.com/ipld/js-ipld/compare/v0.25.4...v0.25.5) (2020-04-23)



<a name="0.25.4"></a>
## [0.25.4](https://github.com/ipld/js-ipld/compare/v0.25.3...v0.25.4) (2020-04-22)


### Bug Fixes

* update deps and use ipld-block ([9bd8aee](https://github.com/ipld/js-ipld/commit/9bd8aee))
* **package:** update cids to version 0.8.0 ([ee554e7](https://github.com/ipld/js-ipld/commit/ee554e7))
* minor improvement to path handling in Node.js tests ([ea53bb3](https://github.com/ipld/js-ipld/commit/ea53bb3))



<a name="0.25.3"></a>
## [0.25.3](https://github.com/ipld/js-ipld/compare/v0.25.2...v0.25.3) (2020-01-13)


### Bug Fixes

* **package:** update multicodec to version 1.0.0 ([2b661da](https://github.com/ipld/js-ipld/commit/2b661da))
* **package:** update typical to version 6.0.0 ([2a9506a](https://github.com/ipld/js-ipld/commit/2a9506a))



<a name="0.25.2"></a>
## [0.25.2](https://github.com/ipld/js-ipld/compare/v0.25.1...v0.25.2) (2019-10-30)



<a name="0.25.1"></a>
## [0.25.1](https://github.com/ipld/js-ipld/compare/v0.25.0...v0.25.1) (2019-10-30)


### Bug Fixes

* **package:** update merge-options to version 2.0.0 ([c55c869](https://github.com/ipld/js-ipld/commit/c55c869))



<a name="0.25.0"></a>
# [0.25.0](https://github.com/ipld/js-ipld/compare/v0.24.1...v0.25.0) (2019-08-01)


### Code Refactoring

* make code promisify free ([23de2e4](https://github.com/ipld/js-ipld/commit/23de2e4))


### BREAKING CHANGES

* Everyone upgrading to this release also needs to upgrade
ipfs-block-service, ipfs-repo and ipld-in-memory.

This commit uses the new async API of:

 - ipfs-block-service >= 0.16.0
 - ipfs-repo >=0.27.0
 - ipld-in-memory >= 3.0.0

If your library has a dependency on any of those, you likely also need
to upgrade to at least those versions.



<a name="0.24.1"></a>
## [0.24.1](https://github.com/ipld/js-ipld/compare/v0.24.0...v0.24.1) (2019-05-15)


### Bug Fixes

* respect the `cidVersion` option ([b1a3a2a](https://github.com/ipld/js-ipld/commit/b1a3a2a))



<a name="0.24.0"></a>
# [0.24.0](https://github.com/ipld/js-ipld/compare/v0.23.0...v0.24.0) (2019-05-10)


### Chores

* update dependencies ([7232eea](https://github.com/ipld/js-ipld/commit/7232eea))


### BREAKING CHANGES

* v1 CIDs now default to base32 encoding

Previous versions returned a base58 encoded string when `toString()`/
`toBaseEncodedString()` was called on a CIDv1. It now returns a base32
encoded string.



<a name="0.23.0"></a>
# [0.23.0](https://github.com/ipld/js-ipld/compare/v0.22.0...v0.23.0) (2019-05-08)


### Bug Fixes

* use the cleaned up IPLD Format API ([108aef0](https://github.com/ipld/js-ipld/commit/108aef0))


### BREAKING CHANGES

* All formats now return data according to the [IPLD Data Model]

The most important change is that now *all* formats return links as [CID instances]
and no longer as the JSON representation (`{"/": "base-encoded-cid"}`.

[IPLD Data Model]: https://github.com/ipld/specs/blob/master/IPLD-Data-Model-v1.md
[CID instances]: https://github.com/multiformats/js-cid/



<a name="0.22.0"></a>
# [0.22.0](https://github.com/ipld/js-ipld/compare/v0.21.1...v0.22.0) (2019-03-21)


### Bug Fixes

* add dynamically loaded format via addFormat() ([95536cd](https://github.com/ipld/js-ipld/commit/95536cd))
* don't throw if it's not a proper old-style link ([38be898](https://github.com/ipld/js-ipld/commit/38be898))
* error if loadFormat() is not a function ([4ad1ee4](https://github.com/ipld/js-ipld/commit/4ad1ee4))
* use a version of typical where async iterators are supported ([43176ca](https://github.com/ipld/js-ipld/commit/43176ca))
* use promisify-es6 instead of Nodes.js' promisify ([79e521c](https://github.com/ipld/js-ipld/commit/79e521c))


### Code Refactoring

* make `_getFormat()` async/await ([996e9dc](https://github.com/ipld/js-ipld/commit/996e9dc))
* store codecs by their code ([d797667](https://github.com/ipld/js-ipld/commit/d797667))


### Features

* add single item functions ([945fc61](https://github.com/ipld/js-ipld/commit/945fc61))
* implementation of the new `addFormat/removeFormat()` functions ([12b436b](https://github.com/ipld/js-ipld/commit/12b436b))
* implementation of the new `get()` function ([743e679](https://github.com/ipld/js-ipld/commit/743e679))
* implementation of the new `put()` function ([8b737b1](https://github.com/ipld/js-ipld/commit/8b737b1))
* implementation of the new `remove()` function ([08c1e0e](https://github.com/ipld/js-ipld/commit/08c1e0e))
* implementation of the new `resolve()` function ([162473b](https://github.com/ipld/js-ipld/commit/162473b))
* implementation of the new `tree()` function ([9801765](https://github.com/ipld/js-ipld/commit/9801765))
* make addFormat() and removeFormat() return the instance ([5f62fe0](https://github.com/ipld/js-ipld/commit/5f62fe0))


### BREAKING CHANGES

* put/get/remove functions are renamed

This commit introduces single item functions which are called `put()`/`get()`,`remove()`.

In order to put, get or remove multiple items you need to call
`putMany()`,`getMany()`/`removeMany()` now.
* This replaces the `treeStream()` function.

The API docs for it:

> Returns all the paths that can be resolved into.

 - `cid` (`CID`, required): the CID to get the paths from.
 - `path` (`IPLD Path`, default: ''): the path to start to retrieve the other paths from.
 - `options`:
   - `recursive` (`bool`, default: false): whether to get the paths recursively or not. `false` resolves only the paths of the given CID.

Returns an async iterator of all the paths (as Strings) you could resolve into.
* They replace the `support.add()` and `support.rm()` functions.

The API docs for it:

`.addFormat(ipldFormatImplementation)`:

> Add support for an IPLD Format

 - `ipldFormatImplementation` (`IPLD Format`, required): the implementation of an IPLD Format.

`.removeFormat(codec)`:

> Remove support for an IPLD Format

 - `codec` (`multicodec`, required): the codec of the IPLD Format to remove.
* `remove()` has a new API.

The API docs for it:

> Remove IPLD Nodes by the given `cids`

 - `cids` (`Iterable<CID>`): the CIDs of the IPLD Nodes that should be
  removed.

Throws an error if any of the Blocks can’t be removed. This operation is
*not* atomic, some Blocks might have already been removed.
* `get()` is replacing the `getMany()` function.

The API docs for it:

> Retrieve several IPLD Nodes at once.

 - `cids` (`Iterable<CID>`): the CIDs of the IPLD Nodes that should be retrieved.

Returns an async iterator with the IPLD Nodes that correspond to the given `cids`.

Throws an error if a IPLD Node can’t be retrieved.
* The API of `put()` changes.

The API docs for it:

> Stores the given IPLD Nodes of a recognized IPLD Format.

 - `nodes` (`Iterable<Object>`): deserialized IPLD nodes that should be inserted.
 - `format` (`multicodec`, required): the multicodec of the format that IPLD Node should be encoded in.
 - `options` is applied to any of the `nodes` and is an object with the following properties:
   - `hashAlg` (`multicodec`, default: hash algorithm of the given multicodec): the hashing algorithm that is used to calculate the CID.
   - `cidVersion` (`boolean`, default: 1): the CID version to use.
   - `onlyHash` (`boolean`, default: false): if true the serialized form of the IPLD Node will not be passed to the underlying block store.

Returns an async iterator with the CIDs of the serialized IPLD Nodes.
* The `codec` parameter in `options.loadFormat()` is a number

Instead of returnign the name of the codec as string, the codec code (a number)
is now returned.

So if you e.g. check within the function for a certain format, it changes from:

    async loadFormat (codec) {
      if (codec !== 'dag-cbor') …
    }

To:

    async loadFormat (codec) {
      if (codec !== multicodec.DAG_CBOR) …
    }
* your custom format loading function needs
to be an async now.

So the signature for `options.loadFormat` is no longer:

   function (codec, callback)

but

  async functiont (codec)
* `resolve()` replaces parts of `get()`.

The API docs for it:

> Retrieves IPLD Nodes along the `path` that is rooted at `cid`.

 - `cid` (`CID`, required): the CID the resolving starts.
 - `path` (`IPLD Path`, required): the path that should be resolved.

Returns an async iterator of all the IPLD Nodes that were traversed during the path resolving. Every element is an object with these fields:
 - `remainderPath` (`string`): the part of the path that wasn’t resolved yet.
 - `value` (`*`): the value where the resolved path points to. If further traversing is possible, then the value is a CID object linking to another IPLD Node. If it was possible to fully resolve the path, `value` is the value the `path` points to. So if you need the CID of the IPLD Node you’re currently at, just take the `value` of the previously returned IPLD Node.



<a name="0.21.1"></a>
## [0.21.1](https://github.com/ipld/js-ipld/compare/v0.21.0...v0.21.1) (2019-01-25)



<a name="0.21.0"></a>
# [0.21.0](https://github.com/ipld/js-ipld/compare/v0.20.2...v0.21.0) (2019-01-16)


### Code Refactoring

* remove inMemory util ([689afcc](https://github.com/ipld/js-ipld/commit/689afcc)), closes [#151](https://github.com/ipld/js-ipld/issues/151)


### BREAKING CHANGES

* This module no longer exports an `inMemory` utility to create an IPLD instance that uses a block service that stores data in memory. Please use the [`ipld-in-memory`](https://www.npmjs.com/package/ipld-in-memory) module instead.

License: MIT
Signed-off-by: Alan Shaw <alan.shaw@protocol.ai>



<a name="0.20.2"></a>
## [0.20.2](https://github.com/ipld/js-ipld/compare/v0.20.1...v0.20.2) (2018-12-19)


### Bug Fixes

* linting passes again ([4fc3c6e](https://github.com/ipld/js-ipld/commit/4fc3c6e))



<a name="0.20.1"></a>
## [0.20.1](https://github.com/ipld/js-ipld/compare/v0.20.0...v0.20.1) (2018-11-19)


### Features

* return cid of last node traversed from ipld.get and friends ([#181](https://github.com/ipld/js-ipld/issues/181)) ([ebcc541](https://github.com/ipld/js-ipld/commit/ebcc541))



<a name="0.20.0"></a>
# [0.20.0](https://github.com/ipld/js-ipld/compare/v0.19.3...v0.20.0) (2018-11-10)


### Bug Fixes

* updates ipld-dag-pb dep to version ([add49fe](https://github.com/ipld/js-ipld/commit/add49fe)), closes [ipld/js-ipld-dag-pb#99](https://github.com/ipld/js-ipld-dag-pb/issues/99) [ipld/js-ipld-dag-pb#99](https://github.com/ipld/js-ipld-dag-pb/issues/99)


### BREAKING CHANGES

* DAGNodes no longer have `.cid` or `.multihash` properties - see



<a name="0.19.3"></a>
## [0.19.3](https://github.com/ipld/js-ipld/compare/v0.19.2...v0.19.3) (2018-11-09)


### Features

* dynamic format loading ([b41033b](https://github.com/ipld/js-ipld/commit/b41033b)), closes [/github.com/ipld/js-ipld/pull/164#discussion_r228121092](https://github.com//github.com/ipld/js-ipld/pull/164/issues/discussion_r228121092)



<a name="0.19.2"></a>
## [0.19.2](https://github.com/ipld/js-ipld/compare/v0.19.1...v0.19.2) (2018-11-07)


### Features

* add getMany() ([db7dc8b](https://github.com/ipld/js-ipld/commit/db7dc8b)), closes [#132](https://github.com/ipld/js-ipld/issues/132)
* adds onlyHash option to ipld.put ([0c78f0e](https://github.com/ipld/js-ipld/commit/0c78f0e))


### Performance Improvements

* fail fast for missing format ([ebd2d1b](https://github.com/ipld/js-ipld/commit/ebd2d1b))



<a name="0.19.1"></a>
## [0.19.1](https://github.com/ipld/js-ipld/compare/v0.19.0...v0.19.1) (2018-10-27)



<a name="0.19.0"></a>
# [0.19.0](https://github.com/ipld/js-ipld/compare/v0.18.0...v0.19.0) (2018-10-25)


### Code Refactoring

* make blockService an option parameter ([f1c2e12](https://github.com/ipld/js-ipld/commit/f1c2e12))
* pass in IPLD Formats into the constructor ([b003ad1](https://github.com/ipld/js-ipld/commit/b003ad1))


### BREAKING CHANGES

* Not all IPLD Formats are included by default

By default only the [ipld-dag-cbor], [ipld-dag-pb] and [raw]
[IPLD Format]s are included. If you want to use other IPLD Formats
you need to pass them into the constructor.

The code to restore the old behaviour could look like this:

```js
const ipldBitcoin = require('ipld-bitcoin')
const ipldDagCbor = require('ipld-dag-cbor')
const ipldDagPb = require('ipld-dag-pb')
const ipldEthAccountSnapshot = require('ipld-ethereum').ethAccountSnapshot
const ipldEthBlock = require('ipld-ethereum').ethBlock
const ipldEthBlockList = require('ipld-ethereum').ethBlockList
const ipldEthStateTrie = require('ipld-ethereum').ethStateTrie
const ipldEthStorageTrie = require('ipld-ethereum').ethStorageTrie
const ipldEthTrie = require('ipld-ethereum').ethTxTrie
const ipldEthTx = require('ipld-ethereum').ethTx
const ipldGit = require('ipld-git')
const ipldRaw = require('ipld-raw')
const ipldZcash = require('ipld-zcash')

…

const ipld = new Ipld({
  blockService: blockService,
  formats: [
    ipldBitcoin, ipldDagCbor, ipldDagPb, ipldEthAccountSnapshot,
    ipldEthBlock, ipldEthBlockList, ipldEthStateTrie, ipldEthStorageTrie,
    ipldEthTrie, ipldEthTx, ipldGit, ipldRaw, ipldZcash
  ]
})
```

[ipld-dag-cbor]: https://github.com/ipld/js-ipld-dag-cbor
[ipld-dag-pb]: https://github.com/ipld/js-ipld-dag-pb
[ipld-raw]: https://github.com/ipld/js-ipld-raw
[IPLD Format]: https://github.com/ipld/interface-ipld-format
* The IPLD constructor is no longer taking a BlockService as its
only parameter, but an objects object with `blockService` as a
key.

You need to upgrade your code if you initialize IPLD.

Prior to this change:

```js
const ipld = new Ipld(blockService)
```

Now:

```js
const ipld = new Ipld({blockService: blockService})
```



<a name="0.18.0"></a>
# [0.18.0](https://github.com/ipld/js-ipld/compare/v0.17.4...v0.18.0) (2018-10-12)

### BREAKING CHANGES

* The API for [dag-cbor](https://github.com/ipld/js-ipld-dag-cbor) changed.
  Links are no longer represented as JSON objects  (`{"/": "base-encoded-cid"}`,
  but as [CID objects](https://github.com/ipld/js-cid). `get()` and
  `getStream()` now always return links as CID objects. `put()` also takes
  CID objects as input. Link represented as old-style JSON objects is still
  supported, but deprecated.

Example:

Prior to this change:

```js
const cid = new CID('QmXed8RihWcWFXRRmfSRG9yFjEbXNxu1bDwgCFAN8Dxcq5')
ipld.put({link: {'/': cid.toBaseEncodedString()}}, {format: 'dag-cbor'}, (err, putCid) => {
  ipld.get(putCid, (err, result) => {
      console.log(result.value)
  })
})
```

Output:

```js
{ link:
   { '/':
      <Buffer 12 20 8a…> } }
```

Now:

```js
const cid = new CID('QmXed8RihWcWFXRRmfSRG9yFjEbXNxu1bDwgCFAN8Dxcq5')
ipld.put({link: cid}, {format: 'dag-cbor'}, (err, putCid) => {
  ipld.get(putCid, (err, result) => {
      console.log(result.value)
  })
})
```

Output:

```js
{ link:
   CID {
     codec: 'dag-pb',
     version: 0,
     multihash:
      <Buffer 12 20 8a…> } }
```

See https://github.com/ipld/ipld/issues/44 for more information on why this
change was made.


<a name="0.17.4"></a>
## [0.17.4](https://github.com/ipld/js-ipld/compare/v0.17.3...v0.17.4) (2018-09-25)


### Bug Fixes

* get missing path ([a069a0f](https://github.com/ipld/js-ipld/commit/a069a0f))
* tests of Zcash were broken ([05b6424](https://github.com/ipld/js-ipld/commit/05b6424))


### Features

* use package-table vs custom script ([366176c](https://github.com/ipld/js-ipld/commit/366176c))


### Performance Improvements

* lazy load format resolvers ([f4a094a](https://github.com/ipld/js-ipld/commit/f4a094a))



<a name="0.17.3"></a>
## [0.17.3](https://github.com/ipld/js-ipld/compare/v0.17.2...v0.17.3) (2018-07-17)


### Bug Fixes

* **put:** pass CID options to resolver ([a419048](https://github.com/ipld/js-ipld/commit/a419048))



<a name="0.17.2"></a>
## [0.17.2](https://github.com/ipld/js-ipld/compare/v0.17.1...v0.17.2) (2018-05-29)



<a name="0.17.1"></a>
## [0.17.1](https://github.com/ipld/js-ipld/compare/v0.17.0...v0.17.1) (2018-05-29)


### Bug Fixes

* "resolver exists" error message typo ([d3d78e0](https://github.com/ipld/js-ipld/commit/d3d78e0))



<a name="0.17.0"></a>
# [0.17.0](https://github.com/ipld/js-ipld/compare/v0.16.0...v0.17.0) (2018-04-11)



<a name="0.16.0"></a>
# [0.16.0](https://github.com/ipld/js-ipld-resolver/compare/v0.15.0...v0.16.0) (2018-04-09)


### Bug Fixes

* handle required options for IPLDResolver.put ([3612289](https://github.com/ipld/js-ipld-resolver/commit/3612289))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/ipld/js-ipld-resolver/compare/v0.14.1...v0.15.0) (2018-02-26)


### Bug Fixes

* resolvers expect binary data ([03eaa25](https://github.com/ipld/js-ipld-resolver/commit/03eaa25))


### Chores

* Rename package from `ipld-resolver` to `ipld` ([8b82a49](https://github.com/ipld/js-ipld-resolver/commit/8b82a49)), closes [#116](https://github.com/ipld/js-ipld-resolver/issues/116)


### Features

* Add support for Bitcoin ([7c4bc2c](https://github.com/ipld/js-ipld-resolver/commit/7c4bc2c))
* Add support for Zcash ([3e3ed35](https://github.com/ipld/js-ipld-resolver/commit/3e3ed35))


### BREAKING CHANGES

* All packages that depend on `ipld-resolver`
need to change their dependency.

Within your package that depends on `ipld-resolver` do:

    npm uninstall ipld-resolver
    npm intall ipld

Then search for all imports of `ipld-resolver` and change from

    const IPLDResolver = require('ipld-resolver')

to

    const Ipld = require('ipld')



<a name="0.14.1"></a>
## [0.14.1](https://github.com/ipld/js-ipld-resolver/compare/v0.14.0...v0.14.1) (2017-11-07)



<a name="0.14.0"></a>
# [0.14.0](https://github.com/ipld/js-ipld-resolver/compare/v0.13.4...v0.14.0) (2017-11-06)


### Bug Fixes

* Windows interop ([#104](https://github.com/ipld/js-ipld-resolver/issues/104)) ([f2d524b](https://github.com/ipld/js-ipld-resolver/commit/f2d524b))



<a name="0.13.4"></a>
## [0.13.4](https://github.com/ipld/js-ipld-resolver/compare/v0.13.3...v0.13.4) (2017-10-11)



<a name="0.13.3"></a>
## [0.13.3](https://github.com/ipld/js-ipld-resolver/compare/v0.13.2...v0.13.3) (2017-10-07)


### Features

* ipld-eth-star -> ipld-ethereum ([#98](https://github.com/ipld/js-ipld-resolver/issues/98)) ([b448e59](https://github.com/ipld/js-ipld-resolver/commit/b448e59))
* raw ipld resolver ([#90](https://github.com/ipld/js-ipld-resolver/issues/90)) ([2968681](https://github.com/ipld/js-ipld-resolver/commit/2968681))



<a name="0.13.2"></a>
## [0.13.2](https://github.com/ipld/js-ipld-resolver/compare/v0.13.1...v0.13.2) (2017-09-07)



<a name="0.13.1"></a>
## [0.13.1](https://github.com/ipld/js-ipld-resolver/compare/v0.13.0...v0.13.1) (2017-09-02)


### Features

* add git support! ([97d8fc3](https://github.com/ipld/js-ipld-resolver/commit/97d8fc3))
* resolver guard (graceful failure) ([#89](https://github.com/ipld/js-ipld-resolver/issues/89)) ([62816a9](https://github.com/ipld/js-ipld-resolver/commit/62816a9))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/ipld/js-ipld-resolver/compare/v0.12.1...v0.13.0) (2017-07-23)



<a name="0.12.1"></a>
## [0.12.1](https://github.com/ipld/js-ipld-resolver/compare/v0.12.0...v0.12.1) (2017-07-11)


### Features

* update ethereum resolvers ([f258c9e](https://github.com/ipld/js-ipld-resolver/commit/f258c9e))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/ipld/js-ipld-resolver/compare/v0.11.1...v0.12.0) (2017-07-04)



<a name="0.11.1"></a>
## [0.11.1](https://github.com/ipld/js-ipld-resolver/compare/v0.11.0...v0.11.1) (2017-05-23)



<a name="0.11.0"></a>
# [0.11.0](https://github.com/ipld/js-ipld-resolver/compare/v0.10.1...v0.11.0) (2017-03-22)


### Features

* migrate to new ipfs-block and block-service api ([c7dd494](https://github.com/ipld/js-ipld-resolver/commit/c7dd494))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/ipld/js-ipld-resolver/compare/v0.10.0...v0.10.1) (2017-03-16)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/ipld/js-ipld-resolver/compare/v0.9.0...v0.10.0) (2017-03-13)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/ipld/js-ipld-resolver/compare/v0.8.1...v0.9.0) (2017-02-11)



<a name="0.8.1"></a>
## [0.8.1](https://github.com/ipld/js-ipld-resolver/compare/v0.8.0...v0.8.1) (2017-02-09)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/ipld/js-ipld-resolver/compare/v0.7.1...v0.8.0) (2017-02-08)


### Features

* improve put API and expose getStream ([#77](https://github.com/ipld/js-ipld-resolver/issues/77)) ([0d67f58](https://github.com/ipld/js-ipld-resolver/commit/0d67f58))



<a name="0.7.1"></a>
## [0.7.1](https://github.com/ipld/js-ipld-resolver/compare/v0.7.0...v0.7.1) (2017-02-08)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/ipld/js-ipld-resolver/compare/v0.6.0...v0.7.0) (2017-02-08)


### Bug Fixes

* adding fix to edge cases in path names ([#74](https://github.com/ipld/js-ipld-resolver/issues/74)) ([dd10fab](https://github.com/ipld/js-ipld-resolver/commit/dd10fab))


### Features

* revamped dag api ([#76](https://github.com/ipld/js-ipld-resolver/issues/76)) ([0e878b0](https://github.com/ipld/js-ipld-resolver/commit/0e878b0))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/ipld/js-ipld-resolver/compare/v0.5.0...v0.6.0) (2017-02-02)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/ipld/js-ipld-resolver/compare/v0.4.3...v0.5.0) (2017-02-02)



<a name="0.4.3"></a>
## [0.4.3](https://github.com/ipld/js-ipld-resolver/compare/v0.4.2...v0.4.3) (2017-01-29)



<a name="0.4.2"></a>
## [0.4.2](https://github.com/ipld/js-ipld-resolver/compare/v0.4.1...v0.4.2) (2017-01-29)


### Bug Fixes

* switch to dag-cbor 0.8.2, the switch to borc in 0.8.3 introduced a bug ([948ca6a](https://github.com/ipld/js-ipld-resolver/commit/948ca6a))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/ipld/js-ipld-resolver/compare/v0.4.0...v0.4.1) (2016-12-13)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/ipld/js-ipld-resolver/compare/v0.3.1...v0.4.0) (2016-12-08)



<a name="0.3.1"></a>
## [0.3.1](https://github.com/ipld/js-ipld-resolver/compare/v0.3.0...v0.3.1) (2016-12-01)



<a name="0.3.0"></a>
# [0.3.0](https://github.com/ipld/js-ipld-resolver/compare/v0.2.0...v0.3.0) (2016-11-24)


### Features

* update to latest dag-pb.DAGNode API ([#67](https://github.com/ipld/js-ipld-resolver/issues/67)) ([8a5b201](https://github.com/ipld/js-ipld-resolver/commit/8a5b201))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/ipld/js-ipld-resolver/compare/v0.1.2...v0.2.0) (2016-11-03)


### Features

* upgrade to new aegir ([#65](https://github.com/ipld/js-ipld-resolver/issues/65)) ([a08f017](https://github.com/ipld/js-ipld-resolver/commit/a08f017))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/ipld/js-ipld-resolver/compare/v0.1.1...v0.1.2) (2016-10-30)



<a name="0.1.1"></a>
## [0.1.1](https://github.com/ipld/js-ipld-resolver/compare/v0.1.0...v0.1.1) (2016-10-26)


### Bug Fixes

* point to the right memory store ([c8ce7c2](https://github.com/ipld/js-ipld-resolver/commit/c8ce7c2))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/ipld/js-ipld-resolver/compare/a138a06...v0.1.0) (2016-10-26)


### Bug Fixes

* **resolve:** Ensure all links are resolved ([abb34fd](https://github.com/ipld/js-ipld-resolver/commit/abb34fd))
* Correct name ([54b1e5f](https://github.com/ipld/js-ipld-resolver/commit/54b1e5f))
* remove dead code ([4aa591c](https://github.com/ipld/js-ipld-resolver/commit/4aa591c))


### Features

* Add basic resolve function ([a138a06](https://github.com/ipld/js-ipld-resolver/commit/a138a06))
* add ipld-dag-cbor to the mix ([a186055](https://github.com/ipld/js-ipld-resolver/commit/a186055))
* create a resolver in memory when no block-service is passed ([00d5d46](https://github.com/ipld/js-ipld-resolver/commit/00d5d46))
* drop getRecursive functions ([05d4e74](https://github.com/ipld/js-ipld-resolver/commit/05d4e74))
* follow new dag-pb interface (from new interface-ipld-format ([91ecfa4](https://github.com/ipld/js-ipld-resolver/commit/91ecfa4))
* main resolver (understands dag-pb) ([0818945](https://github.com/ipld/js-ipld-resolver/commit/0818945))
* move resolver to async IPLD format API, update dag-pb tests ([39db563](https://github.com/ipld/js-ipld-resolver/commit/39db563))
* resolve through different formats ([7978fd6](https://github.com/ipld/js-ipld-resolver/commit/7978fd6))
* support for ipld-dag-pb ([436f44c](https://github.com/ipld/js-ipld-resolver/commit/436f44c))
* Update API, use new block-service, block and ipld-dag-pb ([edee5fa](https://github.com/ipld/js-ipld-resolver/commit/edee5fa))
* update dag-cbor tests to async API, solve dag-cbor bug ([733876b](https://github.com/ipld/js-ipld-resolver/commit/733876b))
* upgrade to latest spec ([c2ec9fe](https://github.com/ipld/js-ipld-resolver/commit/c2ec9fe))



