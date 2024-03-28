import fs from 'fs/promises'
import { z } from 'zod'

export default async (path?: string): Promise<Record<string, unknown>> => {
  const raw = path != null ? await fs.readFile(path, { encoding: 'utf8' }) : '{}'
  const config = z.record(z.unknown()).parse(JSON.parse(raw))

  return config
}
