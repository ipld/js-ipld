# IPLD Resolver

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/ipld/js-ipld-resolver/badge.svg?branch=master)](https://coveralls.io/github/ipld/js-ipld-resolver?branch=master)
[![Travis CI](https://travis-ci.org/ipld/js-ipld-resolver.svg?branch=master)](https://travis-ci.org/ipld/js-ipld-resolver)
[![Circle CI](https://circleci.com/gh/ipld/js-ipld-resolver.svg?style=svg)](https://circleci.com/gh/ipld/js-ipld-resolver)
[![Dependency Status](https://david-dm.org/ipld/js-ipld-resolver.svg?style=flat-square)](https://david-dm.org/ipld/js-ipld-resolver)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D4.0.0-orange.svg?style=flat-square)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/js-ipld-resolver.svg)](https://saucelabs.com/u/js-ipld-resolver)

> JavaScript implementation of the IPLD Resolver

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [IPLD Resolver](#ipldresolver)
    - [`.put(node, cb)`](#putnode-cb)
    - [`.putStream([cb])`](#putstreamcb)
    - [`.get(cid, cb)`](#getcid-cb)
    - [`.getStream(cid)`](#getstreamcid)
    - [`.remove(cid, cb)`](#removecid-cb)
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
> npm install --save ipfs-ipld
```

## Usage

```js
const IPLDResolver = require('ipld-resolver')

// pass an optional blockService, if no blockService is passed,
// one is created in memory.
const ipldResolver = new IPLDResolver(blockService)
```

## API

### IPLD Resolver

#### `.put(node, callback)`

> Store the given node (any JavaScript object).

#### `.putStream([callback])`

Returns a sink pull-stream, to write IPLD objects to.

#### `.get(cid, callback)`

> Retrieve a node by the given `multihash`.

#### `.getStream(cid)`

Returns a source pull-stream of the requested IPLD object.

#### `.remove(cid, callback)`

> Remove a node by the given `multihash`

#### `.resolve(cid, path, callback)`

> Resolves an IPLD path

#### `.support.add(multicodec, formatResolver, formatUtil)`

> Add support to another IPLD Format

#### `.support.rm(multicodec)`

> Removes support of an IPLD Format

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipld/js-ipld-resolver/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
