import { z } from 'zod'
import type { CID } from 'multiformats/cid'

export const VERSION_KEY = 'v'

export const EncodedEntry = z.union([
  z.object({
    cid: z.instanceof(Uint8Array),
    encrypted: z.boolean(),
    timestamp: z.number(),
    blocks: z.number(),
    size: z.number(),
    priority: z.number()
  }),
  z.null()
])

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedEntry = z.infer<typeof EncodedEntry>

export type Entry = {
  [P in keyof NonNullable<EncodedEntry>]: NonNullable<EncodedEntry>[P] extends Uint8Array ? CID : NonNullable<EncodedEntry>[P]
}
