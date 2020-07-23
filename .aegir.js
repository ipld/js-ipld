'use strict'

module.exports = {
  webpack: {
    node: {
      // this is needed until keccak and cipher-base stop using node streams in browser code
      stream: true,

      // this is needed until core-util-is stops using node buffers in browser code
      Buffer: true
    }
  }
}
