import { z } from 'zod'
import type { CID } from 'multiformats/cid'
import type { Database, Keyvalue } from 'welo'

export const EncodedPinInfo = z.object({
  hash: z.instanceof(Uint8Array),
  cid: z.instanceof(Uint8Array)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedPinInfo = z.infer<typeof EncodedPinInfo>

export interface PinInfo {
  hash: Uint8Array
  cid: CID
}

export interface KeyvalueDB extends Database {
  store: Keyvalue
}
