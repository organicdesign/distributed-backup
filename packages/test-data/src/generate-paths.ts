import { createHash } from 'crypto'
import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import { unixfs } from '@helia/unixfs'
import { BlackHoleBlockstore } from 'blockstore-core'
import { compare as uint8ArrayCompareString } from 'uint8arrays/compare'
import type { TestData } from './interface.js'

const generateHash = async (path: string): Promise<Uint8Array> => {
  const hasher = createHash('sha256')

  hasher.write(await fs.readFile(path))

  return hasher.digest()
}

const blockstore = new BlackHoleBlockstore()
const ufs = unixfs({ blockstore })

export default async (): Promise<TestData[]> => {
  const rootPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-data')
  const structure = await fs.readdir(rootPath, { recursive: true, withFileTypes: true })
  const paths: TestData[] = []

  for (const dirent of structure) {
    if (dirent.isDirectory()) {
      continue
    }

    const inPath = Path.join(dirent.path, dirent.name)
    const inHash = await generateHash(inPath)

    const data = await fs.readFile(inPath)
    const all = (await import('it-all')).default
    const [{ cid }] = await all(ufs.addAll([{ path: inPath, content: data }]))

    paths.push({
      cid,
      path: inPath,
      hash: inHash,
      name: dirent.name,

      generatePath (path: string = '/') {
        const tail = inPath.replace(rootPath, '')

        return Path.join(path, tail)
      },

      async validate (path: string): Promise<boolean> {
        const hash = await generateHash(path)

        return uint8ArrayCompareString(inHash, hash) === 0
      }
    })
  }

  return paths
}
