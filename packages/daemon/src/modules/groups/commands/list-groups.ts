import { ListGroups } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(ListGroups.name, async (): Promise<ListGroups.Return> => {
    const promises: Array<{ group: string, name: string }> = []

    for (const { key: cid, value: database } of context.groups.all()) {
      promises.push({ group: cid, name: database.manifest.name })
    }

    return Promise.all(promises)
  })
}

export default command
