import { z } from 'zod'
import { zCID, zEncoding } from '../zod.js'

export const name = 'create-group'

export const Params = z.object({
  name: z.string(),
  peers: z.array(zEncoding('base58btc'))
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = zCID()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
