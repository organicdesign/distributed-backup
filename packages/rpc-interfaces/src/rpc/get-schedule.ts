import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'get-schedule'

export const Params = z.object({
  group: zCID(),
  from: z.number().optional(),
  to: z.number().optional(),
  types: z.array(z.string()).optional().default([])
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  from: z.number(),
  to: z.number(),
  context: z.record(z.any())
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
