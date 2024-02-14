import fs from 'fs/promises'
import { Config } from './modules.js'

export const getConfig = async (path: string): Promise<Config> => {
  const raw = await fs.readFile(path, { encoding: 'utf8' })
  const json = JSON.parse(raw)

  return Config.parse(json)
}
