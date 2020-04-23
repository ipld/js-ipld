/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const chaiAsProised = require('chai-as-promised')
const expect = chai.expect
chai.use(dirtyChai)
chai.use(chaiAsProised)
const BlockService = require('ipfs-block-service')
const CID = require('cids')
const multihash = require('multihashes')
const multicodec = require('multicodec')
const inMemory = require('ipld-in-memory')
const AbortController = require('abort-controller')

const IPLDResolver = require('../src')

module.exports = (repo) => {
  describe('basics', () => {
    it('creates an instance', () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({ blockService: bs })
      expect(r.bs).to.exist()
    })

    it('creates an in memory repo if no blockService is passed', async () => {
      await inMemory(IPLDResolver, (err, r) => {
        expect(err).to.not.exist()
        expect(r.bs).to.exist()
      })
    })

    it.skip('add support to a new format', () => {})
    it.skip('remove support to a new format', () => {})
  })

  describe('validation', () => {
    it('resolve - errors on unknown resolver', async () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({ blockService: bs })
      // choosing a format that is not supported
      const cid = new CID(
        1,
        'blake2b-8',
        multihash.encode(Buffer.from('abcd', 'hex'), 'sha1')
      )
      const result = r.resolve(cid, '')
      await expect(result.next()).to.be.rejectedWith(
        'No resolver found for codec "blake2b-8"')
    })

    it('put - errors on unknown resolver', async () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({ blockService: bs })
      // choosing a format that is not supported
      await expect(r.put(null, multicodec.BLAKE2B_8)).to.be.rejectedWith(
        'No resolver found for codec "blake2b-8"')
    })

    it('put - errors if no format is provided', async () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({ blockService: bs })
      await expect(r.put(null)).to.be.rejectedWith('`put` requires a format')
    })

    it('putMany - errors on unknown resolver', async () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({ blockService: bs })
      // choosing a format that is not supported
      const result = r.putMany([null], multicodec.BLAKE2B_8)
      await expect(result.next()).to.be.rejectedWith(
        'No resolver found for codec "blake2b-8"')
    })

    it('putMany - errors if no format is provided', () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({ blockService: bs })
      expect(() => r.putMany([null])).to.be.throw('`put` requires a format')
    })

    it('tree - errors on unknown resolver', async () => {
      const bs = new BlockService(repo)
      const r = new IPLDResolver({ blockService: bs })
      // choosing a format that is not supported
      const cid = new CID(
        1,
        'blake2b-8',
        multihash.encode(Buffer.from('abcd', 'hex'), 'sha1')
      )
      const result = r.tree(cid)
      await expect(result.next()).to.be.rejectedWith(
        'No resolver found for codec "blake2b-8"')
    })
  })

  describe('aborting requests', () => {
    let abortedErr
    let r

    beforeEach(() => {
      abortedErr = new Error('Aborted!')
      const abortOnSignal = (...args) => {
        const { signal } = args[args.length - 1]

        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(abortedErr)
          })
        })
      }

      const bs = {
        put: abortOnSignal,
        get: abortOnSignal,
        delete: abortOnSignal
      }
      r = new IPLDResolver({ blockService: bs })
    })

    it('put - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.put(Buffer.from([0, 1, 2]), multicodec.RAW, {
        signal: controller.signal
      })).to.eventually.rejectedWith(abortedErr)
    })

    it('putMany - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.putMany([Buffer.from([0, 1, 2])], multicodec.RAW, {
        signal: controller.signal
      }).all()).to.eventually.rejectedWith(abortedErr)
    })

    it('get - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.get('cid', {
        signal: controller.signal
      })).to.eventually.rejectedWith(abortedErr)
    })

    it('getMany - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.getMany(['cid'], {
        signal: controller.signal
      }).all()).to.eventually.rejectedWith(abortedErr)
    })

    it('remove - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.remove('cid', {
        signal: controller.signal
      })).to.eventually.rejectedWith(abortedErr)
    })

    it('removeMany - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.removeMany(['cid'], {
        signal: controller.signal
      }).all()).to.eventually.rejectedWith(abortedErr)
    })

    it('tree - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.tree(new CID('QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'), {
        signal: controller.signal
      }).all()).to.eventually.rejectedWith(abortedErr)
    })

    it('resolve - supports abort signals', async () => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)

      await expect(r.resolve(new CID('QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'), '', {
        signal: controller.signal
      }).all()).to.eventually.rejectedWith(abortedErr)
    })
  })
}
