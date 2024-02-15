import { ListGroups } from 'rpc-interfaces'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: ListGroups.name,

  async method (): Promise<ListGroups.Return> {
    const promises: Array<{ group: string, name: string }> = []

    for (const { key: cid, value: database } of context.groups.all()) {
      promises.push({ group: cid, name: database.manifest.name })
    }

    return Promise.all(promises)
  }
})

export default command
