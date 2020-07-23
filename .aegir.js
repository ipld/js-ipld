'use strict'

module.exports = {
  webpack: {
    node: {
      // this is needed until keccak and cipher-base stop using node streams in browser code
      stream: true,

      // this is needed until core-util-is stops using node buffers in browser code
      Buffer: true,

      // this is needed until webcrypto stops using node crypto in browser code
      crypto: true
    }
  }
}
