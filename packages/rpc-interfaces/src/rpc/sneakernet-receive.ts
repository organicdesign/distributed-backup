import { z } from 'zod'

export const name = 'sneakernet-receive'

export const Params = z.object({
  path: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
