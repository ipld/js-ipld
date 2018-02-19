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

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [IPLD Resolver](#ipldresolver)
    - [`.put(node, options, callback)`](#putnode-cb)
    - [`.get(cid [, path] [, options], callback)`](#getcid-cb)
    - [`.remove(cid, callback)`](#removecid-cb)
    - [`.support.add(multicodec, formatResolver, formatUtil)`]()
    - [`.support.rm(multicodec)`]()
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
> npm install --save ipld-resolver
```

## Usage

```js
const Resolver = require('ipld-resolver')

// You need to create and pass an ipfs-block-service instance
// https://github.com/ipfs/js-ipfs-block-service
const Resolver = new Resolver(<ipfs-block-service instance>)
```

## API

### `.put(node, options, callback)`

> Store the given node of a recognized IPLD Format.

`options` is an object that must contain one of the following combinations:
- `cid` - the CID of the node
- `hashAlg` and `format` - the hashAlg and the format that should be used to create the CID of the node

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

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipld/js-ipld-resolver/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
