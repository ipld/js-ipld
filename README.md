# IPFS IPLD

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs) [![Dependency Status](https://david-dm.org/ipfs/js-ipfs-ipld.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-ipld)
[![Travis CI](https://travis-ci.org/ipfs/js-ipfs-ipld.svg?branch=master)](https://travis-ci.org/ipfs/js-ipfs-ipld)

> JavaScript implementation of the IPLDService

## Usage

```bash
$ npm install --save ipfs-ipld
```

```js
const ipfsIPLD = require('ipfs-ipld')

// available components
ipfsIPLD.IPLDService
```

## API

### IPLDService

#### `.add(node, cb)`

> Store the given node (any JavaScript object).

#### `.get(multihash, cb)`

> Retrieve a node by the given `multihash`.

#### `.getRecursive(multihash, cb)`

> Retrieve a node by the given `multihash` and all linked nodes.

#### `.remove(multihash, cb)`

> Remove a node by the given `multihash`
