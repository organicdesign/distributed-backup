import { NamespaceDatastore } from 'datastore-core'
import { type Datastore, Key } from 'interface-datastore'
import { MEMORY_MAGIC } from './interface.js'

export const isMemory = (storage?: string): boolean => storage === MEMORY_MAGIC

export const extendDatastore = (datastore: Datastore, name: string): NamespaceDatastore => new NamespaceDatastore(datastore, new Key(name))
