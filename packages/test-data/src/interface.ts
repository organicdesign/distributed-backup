import type { CID } from 'multiformats/cid'

export interface TestData {
  cid: CID
  name: string
  path: string
  hash: Uint8Array
  generatePath(path: string): string
  validate(path: string): Promise<boolean>
}
