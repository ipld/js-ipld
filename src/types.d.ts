import { HashCode } from 'multihashes'
import { CIDVersion } from 'cids'
import { CodecCode } from 'multicodec'

export interface PutOptions {
  hashAlg?: HashCode
  cidVersion?: CIDVersion
  onlyHash?: boolean
  signal?: AbortSignal
}