// import * as dagCbor from '@ipld/dag-cbor'
// import { CID } from 'multiformats/cid'
import { type ListGroups } from 'rpc-interfaces'
import { type Components /* , EncodedEntry */ } from '../../interface.js'
// import { countPeers } from '../../utils.js'

export const name = 'list-groups'

export const method = (components: Components) => async (): Promise<ListGroups.Return> => {
  const promises: Array<Promise<{ group: string, name: string }>> = []

  for (const { key: cid, value: database } of components.groups.all()) {
    promises.push((async () => {
      // const index = await database.store.latest()
      // let items = 0

      /*
      const [peers] = await Promise.all([
        countPeers(components, CID.parse(cid), { timeout: 3000 }),

        (async () => {
          try {
            for await (const pair of index.query({})) {
              const entry = EncodedEntry.parse(dagCbor.decode(pair.value))

              if (entry != null) {
                items++
              }
            }
          } catch (error) {
            // Do nothing
          }
        })()
      ])
      */

      return { group: cid, name: database.manifest.name }
    })())
  }

  return Promise.all(promises)
}
