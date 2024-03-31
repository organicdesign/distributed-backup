import { NamespaceDatastore } from 'datastore-core'
import { type Datastore, Key } from 'interface-datastore'

export const extendDatastore = (datastore: Datastore, name: string): NamespaceDatastore => new NamespaceDatastore(datastore, new Key(name))
