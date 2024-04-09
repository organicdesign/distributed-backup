import * as dagPb from '@ipld/dag-pb'
import { CID } from 'multiformats/cid'
// import { sha256 } from 'multiformats/hashes/sha2'
import type { Version as CIDVersion } from 'multiformats/cid'
import type { BlockCodec } from 'multiformats/codecs/interface'
import type { ProgressOptions } from 'progress-events'
import type { WritableStorage } from 'ipfs-unixfs-importer'
import workerpool from 'workerpool'
import Path from 'path'
import { fileURLToPath } from 'url'

const pool = workerpool.pool(Path.join(Path.dirname(fileURLToPath(import.meta.url)), './sha256-worker.js'), { maxWorkers: 15 });

export interface PersistOptions extends ProgressOptions {
  codec?: BlockCodec<any, any>
  cidVersion: CIDVersion
  signal?: AbortSignal
}

export const persist = async (buffer: Uint8Array, blockstore: WritableStorage, options: PersistOptions): Promise<CID> => {
  if (options.codec == null) {
    options.codec = dagPb
  }

  const multihash = await pool.exec('sha256', [buffer])
	console.log(pool.stats())
  const cid = CID.create(options.cidVersion, options.codec.code, multihash)

  await blockstore.put(cid, buffer, options)

  return cid
}
