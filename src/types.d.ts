import { HashCode } from 'multihashes'
import { CIDVersion } from 'cids'
import BlockService from 'ipfs-block-service'
import { Format } from 'interface-ipld-format'
import { CodecCode } from 'multicodec'

export interface PutOptions {
  hashAlg?: HashCode
  cidVersion?: CIDVersion
  onlyHash?: boolean
  signal?: AbortSignal
}

export interface Options {
  blockService: BlockService
  formats?: Format[]
  loadFormat: LoadFormat
}

export type LoadFormat = (code: CodecCode) => Promise<IPLDFormat>
