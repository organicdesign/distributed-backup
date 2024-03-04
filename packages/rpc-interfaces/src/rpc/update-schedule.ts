import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'update-schedule'

export const Params = z.object({
  id: z.string(),
  group: zCID(),
  context: z.record(z.any())
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
