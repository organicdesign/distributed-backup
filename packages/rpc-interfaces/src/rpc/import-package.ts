import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'import-package'

export const Params = z.object({
  group: zCID(),
  path: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.object({
  cid: zCID(),
  name: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
