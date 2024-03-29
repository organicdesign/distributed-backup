import { RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import type { CID } from 'multiformats/cid'

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

export const DATA_KEY = 'r'

export const LocalEntryData = z.object({
  priority: z.number().min(0).max(100),
  revisionStrategy: RevisionStrategies
}).partial()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LocalEntryData = z.infer<typeof LocalEntryData>

export const EncodedEntry = z.union([
  z.object({
    cid: z.instanceof(Uint8Array),
    author: z.instanceof(Uint8Array),
    encrypted: z.boolean(),
    timestamp: z.number(),
    blocks: z.number(),
    size: z.number(),
    sequence: z.number(),
    priority: z.number(),
    revisionStrategy: RevisionStrategies
  }),
  z.null()
])

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedEntry = z.infer<typeof EncodedEntry>

export interface Entry extends Omit<NonNullable<EncodedEntry>, 'cid'> {
  cid: CID
}
