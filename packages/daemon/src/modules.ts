import * as FileSystem from "./modules/filesystem/index.js"
import * as Network from "./modules/network/index.js"
import type { Components } from './interface.js'

export const commands = [
  ...FileSystem.commands,
	...Network.commands
] as Array<{
  name: string
  method(components: Components): (params: Record<string, unknown>) => Promise<unknown> | unknown
}>
