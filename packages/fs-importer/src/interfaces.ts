import type { Chunker } from 'ipfs-unixfs-importer/chunker'
import type { CID, Version } from 'multiformats/cid'
import type { Hasher } from 'multiformats/hashes/hasher'

export interface ImporterConfig {
  chunker: Chunker
  hasher: Hasher<string, number>
  cidVersion: Version
}

export interface ImportResult {
  cid: CID
  size: number
}

export interface EncryptionParams {
  iv: Uint8Array
  salt: Uint8Array
}

export interface Cipher {
  encrypt(data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>, params?: EncryptionParams): AsyncIterable<Uint8Array>
  generate(data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<EncryptionParams>
}
