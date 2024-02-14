import { ListGroups } from 'rpc-interfaces'
import type { Groups } from '@/groups.js'
import { type RPCCommand } from '@/interface.js'

export interface Components {
  groups: Groups
}

const command: RPCCommand<Components> = {
  name: ListGroups.name,

  method: (components: Components) => async (): Promise<ListGroups.Return> => {
    const promises: Array<{ group: string, name: string }> = []

    for (const { key: cid, value: database } of components.groups.all()) {
      promises.push({ group: cid, name: database.manifest.name })
    }

    return Promise.all(promises)
  }
}

export default command
