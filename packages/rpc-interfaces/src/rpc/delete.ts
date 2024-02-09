import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'delete'

export const Params = z.object({
  path: z.string(),
  group: zCID()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  path: z.string(),
  cid: zCID()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
