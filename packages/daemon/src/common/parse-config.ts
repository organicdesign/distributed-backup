import fs from 'fs/promises'
import { z } from 'zod'

export interface Provides extends Record<string, unknown> {
  config: Record<string, unknown>
  get <T extends z.AnyZodObject>(shape: T): z.infer<T>
}

export default async (path: string): Promise<<T extends z.AnyZodObject>(shape: T) => z.infer<T>> => {
  const raw = await fs.readFile(path, { encoding: 'utf8' })
  const config = z.record(z.unknown()).parse(JSON.parse(raw))
  const get = <T extends z.AnyZodObject>(shape: T): z.infer<T> => shape.parse(config)

  return get
}
