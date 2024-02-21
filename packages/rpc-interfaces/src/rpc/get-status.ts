import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'get-status'

export const Params = z.object({
  cids: z.array(zCID())
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.array(z.object({
  cid: zCID(),
  state: z.enum(['COMPLETED', 'DOWNLOADING', 'NOTFOUND', 'UPLOADING', 'DESTROYED']),
  blocks: z.number().int().min(0),
  size: z.number().int().min(0)
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
