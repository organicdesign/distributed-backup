import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import type { PathInfo } from './interface.js'

export default async (): Promise<PathInfo[]> => {
  const rootPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-data')
  const structure = await fs.readdir(rootPath, { recursive: true, withFileTypes: true })
  const paths: PathInfo[] = []

  for (const dirent of structure) {
    if (dirent.isDirectory()) {
      continue
    }

    paths.push({
      path: Path.join(dirent.path, dirent.name),
      name: dirent.name
    })
  }

  return paths
}
