<h1 align="center">
  <a href="libp2p.io"><img width="250" src="https://ipld.io/img/ipld-logo.png" alt="ipld hex logo" /></a>
</h1>

<h3 align="center">The JavaScript implementation of the IPLD, InterPlanetary Linked-Data</h3>

<p align="center">
  <a href="http://protocol.ai"><img src="https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square" /></a>
  <a href="http://ipld.io/"><img src="https://img.shields.io/badge/project-ipld-blue.svg?style=flat-square" /></a>
  <a href="http://webchat.freenode.net/?channels=%23ipfs"><img src="https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square" /></a>
  <a href="https://waffle.io/ipld/js-ipld"><img src="https://img.shields.io/badge/pm-waffle-blue.svg?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://travis-ci.org/ipld/js-ipld"><img src="https://travis-ci.org/ipld/js-ipld.svg?branch=master" /></a>
  <a href="https://circleci.com/gh/ipld/js-ipld"><img src="https://circleci.com/gh/ipld/js-ipld.svg?style=svg" /></a>
  <a href="https://coveralls.io/github/ipld/js-ipld?branch=master"><img src="https://coveralls.io/repos/github/ipld/js-ipld/badge.svg?branch=master"></a>
  <br>
  <a href="https://david-dm.org/ipld/js-ipld"><img src="https://david-dm.org/ipld/js-ipld.svg?style=flat-square" /></a>
  <a href="https://github.com/feross/standard"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"></a>
  <a href=""><img src="https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square" /></a>
  <a href=""><img src="https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square" /></a>
  <br>
</p>

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
