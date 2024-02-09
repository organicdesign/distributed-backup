import { z } from 'zod'
import { zCID, RevisionStrategies } from '../zod.js'

export const name = 'import'

export const Params = z.object({
  group: zCID(),
  inPath: z.string(),
  path: z.string().optional().default('/'),
  hash: z.string().optional().default('sha2-256'),
  cidVersion: z.union([z.literal(0), z.literal(1)]).optional().default(1),
  chunker: z.string().optional().default('size-262144'),
  rawLeaves: z.boolean().optional().default(true),
  encrypt: z.boolean().optional().default(false),
  onlyHash: z.boolean().optional().default(false),
  priority: z.number().optional().default(1),
  revisionStrategy: RevisionStrategies.optional().default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  cid: zCID(),
  inPath: z.string(),
  path: z.string()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
