import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'set-priority'

export const Params = z.object({
  priority: z.number().int().min(1).max(100),
  group: zCID(),
  path: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
