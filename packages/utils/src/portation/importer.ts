import assert from 'assert'
import fs from 'fs/promises'
import Path from 'path'
import { unixfs, globSource, type AddOptions } from '@helia/unixfs'
import all from 'it-all'
import type { Blockstore } from 'interface-blockstore'
import type { ImportResult } from 'ipfs-unixfs-importer'

export const importer = async function * (blockstore: Blockstore, path: string, options: AddOptions = {}): AsyncIterable<ImportResult & { path: string }> {
  const ufs = unixfs({ blockstore })
  const stat = await fs.stat(path)
  const globPattern = stat.isFile() ? path.split('/').pop() ?? '' : '**/*'

  if (stat.isFile()) {
    path = Path.join(path, '..')
  }

  for await (const src of globSource(path, globPattern)) {
    assert(src.path != null)

    const rPath = Path.join(path, src.path)
    const stat = await fs.stat(rPath)

    if (stat.isDirectory()) {
      continue
    }

    const [result] = await all(ufs.addAll([src], options))

    yield { ...result, path: rPath }
  }
}
