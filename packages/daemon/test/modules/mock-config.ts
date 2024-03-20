import { type z } from 'zod'
import type { Provides } from '../../src/modules/config/index.js'

const provs = (config: Record<string, unknown>): Provides => ({
  config,

  get <T extends z.AnyZodObject = z.AnyZodObject>(schema: T): z.infer<T> {
    return schema.parse(config)
  }
})

export default provs
