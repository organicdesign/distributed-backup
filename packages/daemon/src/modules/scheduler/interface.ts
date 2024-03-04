import { z } from 'zod'
import type { CID } from 'multiformats/cid'

export const SCHEDULE_KEY = 's'

export const EncodedEntry = z.union([
  z.object({
    from: z.number().min(0),
    to: z.number().min(0),
    type: z.string(),
    context: z.record(z.string())
  }),
  z.null()
])

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedEntry = z.infer<typeof EncodedEntry>

export type Entry = {
  [P in keyof NonNullable<EncodedEntry>]: NonNullable<EncodedEntry>[P] extends Uint8Array ? CID : NonNullable<EncodedEntry>[P]
}

// Possible interfaces for the entry context.
export const ExecutionContext = z.object({
  action: z.string(),
  priority: z.number().min(1).max(100),
  params: z.record(z.any())
})

export const EventContext = z.object({
  title: z.string(),
  description: z.string()
})
