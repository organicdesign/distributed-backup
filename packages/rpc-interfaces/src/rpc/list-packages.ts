import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'list-packages'

export const Params = z.object({
  group: zCID()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  cid: zCID(),
  name: z.string()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
