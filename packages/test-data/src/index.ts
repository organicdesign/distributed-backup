import generateData from './generate-data.js'
import type { TestData } from './interface.js'

export { root } from './generate-data.js'

export const data = await generateData()

export const getDataFile = (path: string): TestData | null => {
  return data.find(p => p.path === path) ?? null
}
