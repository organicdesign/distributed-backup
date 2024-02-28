import Path from 'path'
import { fileURLToPath } from 'url'
import { NamespaceDatastore } from 'datastore-core'
import * as cborg from 'cborg'
import { type Datastore, Key } from 'interface-datastore'
import { MEMORY_MAGIC } from './interface.js'

export const projectPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../../../..')

export const isMemory = (storage?: string): boolean => storage === MEMORY_MAGIC

export const extendDatastore = (datastore: Datastore, name: string): NamespaceDatastore => new NamespaceDatastore(datastore, new Key(name))

export const encodeAny = <T = unknown>(data: T): Uint8Array => {
  return cborg.encode(data)
}

export const decodeAny = <T = unknown>(data: Uint8Array): T => {
  return cborg.decode(data)
}
