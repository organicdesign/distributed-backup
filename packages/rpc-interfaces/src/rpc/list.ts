import { z } from 'zod'
import { zCID, zEncoding, RevisionStrategies } from '../zod.js'

export const name = 'list'

export const Params = z.object({
  group: zCID().optional(),
  path: z.string().optional().default('/')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  path: z.string(),
  cid: zCID(),
  name: z.string(),
  group: zCID(),
  priority: z.number(),
  blocks: z.number().int().min(0),
  size: z.number().int().min(0),
  timestamp: z.number().int().min(0),
  encrypted: z.boolean(),
  author: zEncoding('base58btc'),
  revisionStrategy: RevisionStrategies
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
