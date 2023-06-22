import * as dagPb from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import * as raw from 'multiformats/codecs/raw'
import { CustomProgressEvent } from 'progress-events'
import { CID, Version } from 'multiformats/cid'
import Path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from "worker_threads";
import { tsResolve } from "./utils.js";
import type { ProgressOptions, ProgressEvent } from 'progress-events'
import type { Blockstore } from 'interface-blockstore'
import type { BlockCodec } from 'multiformats/codecs/interface'
import { sha256 } from 'multiformats/hashes/sha2'
import { JSONRPCClient } from "json-rpc-2.0";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

export type WritableStorage = Pick<Blockstore, 'put'>

export interface PersistOptions extends ProgressOptions {
  codec?: BlockCodec<any, any>
  cidVersion: Version
  signal?: AbortSignal
}

export const persist = async (buffer: Uint8Array, blockstore: WritableStorage, options: PersistOptions): Promise<CID> => {
  if (options.codec == null) {
    options.codec = dagPb
  }

  const multihash = await sha256.digest(buffer)
  const cid = CID.create(options.cidVersion, options.codec.code, multihash)

  await blockstore.put(cid, buffer, options)

  return cid
}

/**
 * Passed to the onProgress callback while importing files
 */
export interface ImportWriteProgress {
  /**
   * How many bytes we have written for this source so far - this may be
   * bigger than the file size due to the DAG-PB wrappers of each block
   */
  bytesWritten: bigint

  /**
   * The CID of the block that has been written
   */
  cid: CID

  /**
   * The path of the file being imported, if one was specified
   */
  path?: string
}

export type BufferImportProgressEvents =
  ProgressEvent<'unixfs:importer:progress:file:write', ImportWriteProgress>

export interface BufferImporterOptions extends ProgressOptions<BufferImportProgressEvents> {
  cidVersion: Version
  rawLeaves: boolean
  leafType: 'file' | 'raw'
}

const worker = new Worker(Path.join(__dirname, tsResolve("./hasher.ts")));

worker.on("message", (res) => {
	client.receive(res);
})

const client = new JSONRPCClient(req => {
	worker.postMessage(req);
});

export function defaultBufferImporter () {

	const options: BufferImporterOptions = {
		rawLeaves: true,
		leafType: "file",
		cidVersion: 1
	};

	const inItr: AsyncIterable<any> = {
		[Symbol.asyncIterator]: (): AsyncIterator<Uint8Array> => {
			return {
				async next (): Promise<IteratorResult<Uint8Array>> {
					return await new Promise(resolve => worker.once("message", resolve));
				}
			};
		}
	}

	return async function * bufferImporter (file, blockstore) {
    let bytesWritten = 0n

    for await (let block of file.content) {
      yield async () => { // eslint-disable-line no-loop-func
        let unixfs

        const opts: PersistOptions = {
          codec: dagPb,
          cidVersion: options.cidVersion,
          onProgress: options.onProgress
        }

        if (options.rawLeaves) {
          opts.codec = raw
          opts.cidVersion = 1
        } else {
					const res = await client.request("hash", {
            type: options.leafType,
            data: block
          });


          unixfs = res.unixfs;
          block = res.block;
        }

        const cid = await persist(block, blockstore, opts)

        bytesWritten += BigInt(block.byteLength)

        options.onProgress?.(new CustomProgressEvent<ImportWriteProgress>('unixfs:importer:progress:file:write', {
          bytesWritten,
          cid,
          path: file.path
        }))

        return {
          cid,
          unixfs,
          size: BigInt(block.length),
          block
        }
      }
    }
  }
}
