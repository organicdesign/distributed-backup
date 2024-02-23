import { z } from 'zod'
import { zCID, zEncoding } from '../zod.js'

export const name = 'export-revision'

export const Params = z.object({
  path: z.string(),
  outPath: z.string(),
  group: zCID(),
  author: zEncoding('base58btc'),
  sequence: z.number().int().min(0)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
