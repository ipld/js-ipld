import { HashCode } from 'multihashes'
import { CIDVersion } from 'cids'
import BlockService from 'ipfs-block-service'
import { Format } from 'interface-ipld-format'
import { CodecCode } from 'multicodec'

export type LoadFormatFn = (code: CodecCode) => Promise<Format<any>>

export interface Options {
  blockService: BlockService
  formats?: Format<any>[]
  loadFormat: LoadFormatFn
}

export interface ResolveOptions {
  signal?: AbortSignal
}

export interface PutOptions {
  hashAlg?: HashCode
  cidVersion?: CIDVersion
  onlyHash?: boolean
  signal?: AbortSignal
}

export interface GetOptions {
  signal?: AbortSignal
}

export interface RemoveOptions {
  signal?: AbortSignal
}

export interface TreeOptions {
  recursive?: boolean
  signal?: AbortSignal
}
