import { z } from 'zod'
import { zEncoding } from '../zod.js'

export const name = 'sneakernet-send'

export const Params = z.object({
  path: z.string(),
  size: z.number().int().min(0).optional(),
  peers: z.array(zEncoding('base58btc')).optional()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
