import fs from 'fs/promises'
import { z } from 'zod'
import type { Module } from '@/interface.js'
import type { Provides as Argv } from '@/modules/argv/index.js'

export interface Requires extends Record<string, unknown> {
  argv: Argv
}

export interface Provides extends Record<string, unknown> {
  config: Record<string, unknown>
  get <T extends z.AnyZodObject>(shape: T): z.infer<T>
}

const module: Module<Provides, Requires> = async ({ argv }) => {
  const raw = await fs.readFile(argv.config, { encoding: 'utf8' })
  const config = z.record(z.unknown()).parse(JSON.parse(raw))
  const get = <T extends z.AnyZodObject>(shape: T): z.infer<T> => shape.parse(config)

  return { config, get }
}

export default module
