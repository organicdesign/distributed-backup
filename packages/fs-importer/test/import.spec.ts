import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { importer, selectChunker, selectHasher } from '../src/index.js'

const dataPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-data')

describe('importer', () => {
  it('imports a file ', async () => {
    const path = Path.join(dataPath, 'file-1.txt')
    const cid = CID.parse('bafybeihoqexapn3tusc4rrkqztzzemz7y57esnzg7eutsua4ehjkylmjqe')
    const { size } = await fs.stat(path)

    const results = await all(importer(
      new BlackHoleBlockstore(),
      path,
      { chunker: selectChunker(), hasher: selectHasher(), cidVersion: 1 }
    ))

    assert.deepEqual(results, [{ cid, path, size }])
  })
})
