import type { CID } from 'multiformats/cid'

export interface DataFile {
  cid: CID
  name: string
  path: string
  hash: Uint8Array
  size: bigint
  generatePath(path: string): string
  validate(path: string): Promise<boolean>
}
