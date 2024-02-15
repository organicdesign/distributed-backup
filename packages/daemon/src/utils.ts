import Path from 'path'
import { fileURLToPath } from 'url'
import * as cborg from 'cborg'
import { type Datastore, Key } from 'interface-datastore'
import { type CID } from 'multiformats/cid'
import { NamespaceDatastore } from 'namespace-datastore'
import { type Libp2p, MEMORY_MAGIC } from './interface.js'

export const projectPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../../../..')

export const isMemory = (storage?: string): boolean => storage === MEMORY_MAGIC

export const extendDatastore = (datastore: Datastore, name: string): NamespaceDatastore => new NamespaceDatastore(datastore, new Key(name))

export const encodeAny = <T = unknown>(data: T): Uint8Array => {
  return cborg.encode(data)
}

export const decodeAny = <T = unknown>(data: Uint8Array): T => {
  return cborg.decode(data)
}

export const countPeers = async ({ libp2p }: { libp2p: Libp2p }, cid: CID, options?: { timeout: number }): Promise<number> => {
  let count = 0

  const itr = libp2p.contentRouting.findProviders(cid, {
    signal: AbortSignal.timeout(options?.timeout ?? 3000)
  })

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of itr) {
      count++
    }
  } catch (error) {
    // Do nothing
  }

  return count
}
