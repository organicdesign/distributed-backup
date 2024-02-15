import { type CID } from 'multiformats/cid'
import { RevisionStrategies } from 'rpc-interfaces/zod'
import { z } from 'zod'

export const VERSION_KEY = 'v'
export const DATA_KEY = 'r'

export const LocalEntryData = z.object({
  priority: z.number().min(0).max(100),
  revisionStrategy: RevisionStrategies
})

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

export type Entry = {
  [P in keyof NonNullable<EncodedEntry>]: NonNullable<EncodedEntry>[P] extends Uint8Array ? CID : NonNullable<EncodedEntry>[P]
}
