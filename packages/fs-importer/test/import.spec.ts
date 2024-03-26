import assert from 'assert/strict'
import Path from 'path'
import { fileURLToPath } from 'url'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { importer, selectChunker, selectHasher } from '../src/index.js'

const dataPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-data')

const blockstore = new BlackHoleBlockstore()

const importerConfig = {
  chunker: selectChunker(),
  hasher: selectHasher(),
  cidVersion: 1
} as const

const expectedData = [
  {
    cid: CID.parse('bafkreig5rpawfjnti2uck52ndflv6o4urk6rtqexwpspmpcv3tc7xilfui'),
    path: Path.join(dataPath, 'file-1.txt'),
    size: 447n
  },
  {
    cid: CID.parse('bafkreifjsfnld3qc5kwru3qkzcpqbryanuj6ocyjhgpguoukwn7jjjgaa4'),
    path: Path.join(dataPath, 'file-2.txt'),
    size: 1791n
  },
  {
    cid: CID.parse('bafkreifuptapcbfwfvghymf422h5rztwcpripxck3dbrb3yqzow6vhcdqa'),
    path: Path.join(dataPath, 'dir-1/file-3.txt'),
    size: 45n
  }
]

describe('importer', () => {
  it('imports files ', async () => {
    for (const data of expectedData) {
      const results = await all(importer(
        blockstore,
        data.path,
        importerConfig
      ))

      for (const result of results) {
        delete result.unixfs
      }

      assert.deepEqual(results, [data])
    }
  })

  it('imports a directory ', async () => {
    const results = await all(importer(
      blockstore,
      dataPath,
      importerConfig
    ))

    for (const result of results) {
      delete result.unixfs
    }

    assert.deepEqual(results, expectedData)
  })
})
