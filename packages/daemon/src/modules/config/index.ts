import type { Module } from '@/interface.js'
import type { Provides as Argv } from '@/modules/argv/index.js'
import fs from 'fs/promises'
import { z } from 'zod'

export interface Init extends Record<string, unknown> {}

export interface Requires extends Record<string, unknown> {
	argv: Argv
}

export interface Provides extends Record<string, unknown> {
	config: Record<string, unknown>,
	getConfig <T extends z.AnyZodObject>(shape: T): z.infer<T>
}

const module: Module<Init, Requires, Provides> = async ({ argv }, __) => {
	const raw = await fs.readFile(argv.config, { encoding: 'utf8' })
	const config = z.record(z.unknown()).parse(JSON.parse(raw))
	const getConfig = <T extends z.AnyZodObject>(shape: T) => shape.parse(config)

  return { components: { config, getConfig } }
}

export default module
