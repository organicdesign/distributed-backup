import { z } from 'zod'

export const name = 'downloader'

export const Params = z.object({
  pause: z.boolean().optional()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Params = z.input<typeof Params>

export const Return = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Return = z.infer<typeof Return>
