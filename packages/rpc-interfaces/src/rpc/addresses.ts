import { z } from 'zod'
import { zMultiaddr } from '../zod.js'

export const name = 'addresses'

export const Params = z.object({})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(zMultiaddr())

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
