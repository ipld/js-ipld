import { HashCode } from 'multihashes'
import { CIDVersion } from 'cids'

export interface PutOptions {
  hashAlg?: HashCode
  cidVersion?: CIDVersion
  onlyHash?: boolean
  signal?: AbortSignal
}
