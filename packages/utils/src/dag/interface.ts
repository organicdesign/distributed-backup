import type { CID } from 'multiformats/cid'

export interface DagWalkResult {
  cid: CID
  depth: number
  block: Uint8Array
}
