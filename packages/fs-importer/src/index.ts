// import importEncryptedFunc from './import-encrypted.js'
// import importPlaintextFunc from './import-plaintext.js'
// import importRecursiveFunc from './import-recursive.js'
import assert from 'assert'
import fs from 'fs/promises'
import Path from 'path'
import { unixfs, globSource, type AddOptions } from '@helia/unixfs'
import all from 'it-all'
import selectChunkerFunc from './select-chunker.js'
import selectHasherFunc from './select-hasher.js'
import type { Blockstore } from 'interface-blockstore'
import type { ImportResult } from 'ipfs-unixfs-importer'

export type * from './interfaces.js'

export const selectHasher = selectHasherFunc
export const selectChunker = selectChunkerFunc
// No longer want to support these methods, keeping them here for reference.
// export const importPlaintext = importPlaintextFunc
// export const importEncrypted = importEncryptedFunc

export const importer = async function * (blockstore: Blockstore, path: string, options: AddOptions = {}): AsyncIterable<ImportResult & { path: string }> {
  const ufs = unixfs({ blockstore })

  const stat = await fs.lstat(path)

  const globPattern = stat.isFile() ? path.split('/').pop() ?? '' : '**/*'

  if (stat.isFile()) {
    path = Path.join(path, '..')
  }

  for await (const src of globSource(path, globPattern)) {
    assert(src.path != null)

    const rPath = Path.join(path, src.path)
    const stat = await fs.lstat(rPath)

    if (stat.isDirectory()) {
      continue
    }

    const [result] = await all(ufs.addAll([src], options))

    yield { ...result, path: rPath }
  }
}
