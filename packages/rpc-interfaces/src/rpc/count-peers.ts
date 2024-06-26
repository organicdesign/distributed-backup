import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'count-peers'

export const Params = z.object({
  cid: zCID(),
  timeout: z.number().int().min(0).optional().default(3000)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.number().int().min(0)

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
