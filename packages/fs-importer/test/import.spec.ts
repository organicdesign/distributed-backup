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

  it('imports a directory ', async () => {
    const results = await all(importer(
      new BlackHoleBlockstore(),
      dataPath,
      { chunker: selectChunker(), hasher: selectHasher(), cidVersion: 1 }
    ))

    assert.deepEqual(results, [
      {
        cid: CID.parse('bafybeihoqexapn3tusc4rrkqztzzemz7y57esnzg7eutsua4ehjkylmjqe'),
        path: Path.join(dataPath, 'file-1.txt'),
        size: 447
      },
      {
        cid: CID.parse('bafybeibac7pp5mcxkj7s55bjdbr7tj3pj7col4janvm36y4fjvxqs67fsi'),
        path: Path.join(dataPath, 'file-2.txt'),
        size: 1791
      },
      {
        cid: CID.parse('bafybeihxa6uyvmdl6wdjxnwpluocix2csrq3ifunemjr2jxy35wjkl2v64'),
        path: Path.join(dataPath, 'dir-1/file-3.txt'),
        size: 45
      }
    ])
  })
})
