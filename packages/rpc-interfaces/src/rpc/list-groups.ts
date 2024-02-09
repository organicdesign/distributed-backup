import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'list-groups'

export const Params = z.object({})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  group: zCID(),
  name: z.string()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
