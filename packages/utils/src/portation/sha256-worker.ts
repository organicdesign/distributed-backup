/*import { parentPort } from 'worker_threads'
import assert from 'assert/strict'
import { sha256, sha512 } from 'multiformats/hashes/sha2'
import { Digest } from 'multiformats/hashes/digest'

assert(parentPort != null)

const port = parentPort

port.on('message', async (message: { input: Uint8Array, id: number }) => {
  const digest = await sha256.digest(message.input)

  port.postMessage({ id: message.id, digest });
});
*/
import { sha256 } from 'multiformats/hashes/sha2'
import workerpool from 'workerpool'
import { Digest } from 'multiformats/hashes/digest'


// create a worker and register public functions
workerpool.worker({
  async sha256 (input: Uint8Array): Promise<Digest<typeof sha256.code, number>> {
		return await sha256.digest(input)
	}
});
