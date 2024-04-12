import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'pause'

export const Params = z.object({
  path: z.string().optional(),
  group: zCID().optional()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
