import { z } from 'zod'

export const Config = z.object({
  storage: z.string().default(':memory:'),
  slots: z.number().int().min(1).max(100).default(20),
  tickInterval: z.number().default(10 * 60),
  serverMode: z.boolean().default(false),
  private: z.boolean().default(false),
  bootstrap: z.array(z.string()).default([]),
  addresses: z.array(z.string()).default([
    '/ip4/127.0.0.1/tcp/0',
    '/ip4/127.0.0.1/tcp/0/ws'
  ])
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>
