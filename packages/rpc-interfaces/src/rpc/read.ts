import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'read'

export const Params = z.object({
  group: zCID(),
  path: z.string(),
  position: z.number().int().min(0).optional().default(0),
  length: z.number().int().min(0).optional().default(1024 ** 2)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.string()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
