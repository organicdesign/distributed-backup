import { parse } from './parse.js'
import type { DataFile } from './interface.js'

export * from './interface.js'
export { root } from './parse.js'

export const files = await parse()

export const getFile = (path: string): DataFile | null => {
  return files.find(f => f.path === path) ?? null
}
