import { z } from 'zod'
import { zCID } from '../zod.js'

export const name = 'export-package'

export const Params = z.object({
  name: z.string(),
  group: zCID(),
  path: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.string()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
