import assert from 'assert/strict'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import { importer, selectHasher, selectChunker } from '@organicdesign/db-fs-importer'
import { MemoryBlockstore } from 'blockstore-core'
import all from 'it-all'
import { exporter } from '../src/index.js'

const inPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-data')
const outPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-data-out')

const blockstore = new MemoryBlockstore()

const importerConfig = {
  chunker: selectChunker(),
  hasher: selectHasher(),
  cidVersion: 1
} as const

const paths = [
  'file-1.txt',
  'file-2.txt',
  'dir-1/file-3.txt'
].map(path => ({
  in: Path.join(inPath, path),
  out: Path.join(outPath, path)
}))

const hash = async (path: string): Promise<Uint8Array> => {
  const hasher = createHash('sha256')

  hasher.write(await fs.readFile(path))

  return hasher.digest()
}

describe('exporter', () => {
  beforeEach(async () => {
    await fs.mkdir(outPath, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(outPath, { recursive: true })
  })

  it('exports files ', async () => {
    for (const path of paths) {
      const results = await all(importer(
        blockstore,
        path.in,
        importerConfig
      ))

      await exporter(blockstore, path.out, results[0].cid)

      const hashes = await Promise.all([hash(path.in), hash(path.out)])

      assert.deepEqual(hashes[0], hashes[1])
    }
  })

  it('exports a directory ', async () => {
    const results = await all(importer(
      blockstore,
      inPath,
      importerConfig
    ))

    for (const { cid, path } of results) {
      const exportPath = path.replace(inPath, outPath)

      await exporter(blockstore, exportPath, cid)
    }

    for (const path of paths) {
      const hashes = await Promise.all([hash(path.in), hash(path.out)])

      assert.deepEqual(hashes[0], hashes[1])
    }
  })
})
