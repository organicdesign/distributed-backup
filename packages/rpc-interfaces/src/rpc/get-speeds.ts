import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'get-speeds'

export const Params = z.object({
  cids: z.array(zCID()),
  range: z.number().int().min(0).optional().default(10000)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  cid: zCID(),
  speed: z.number().int().min(0)
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
