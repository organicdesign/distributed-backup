import { z } from 'zod'
import { zCID, RevisionStrategies } from '../zod.js'

export const name = 'edit'

export const Params = z.object({
  path: z.string(),
  group: zCID(),
  priority: z.number().optional(),
  revisionStrategy: RevisionStrategies.optional()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
