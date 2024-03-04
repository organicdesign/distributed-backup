import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'put-schedule'

export const Params = z.object({
  group: zCID(),
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  type: z.string(),
  context: z.record(z.any())
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
