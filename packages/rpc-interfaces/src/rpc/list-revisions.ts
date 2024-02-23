import { z } from 'zod'
import { zCID, zEncoding } from '../zod.js'

export const name = 'list-revisions'

export const Params = z.object({
  path: z.string(),
  group: zCID()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  cid: zCID(),
  encrypted: z.boolean(),
  author: zEncoding('base58btc'),
  sequence: z.number(),
  timestamp: z.number(),
  size: z.number(),
  blocks: z.number()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
