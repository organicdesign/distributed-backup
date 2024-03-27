import { ListGroups } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ net, groups }) => {
  net.rpc.addMethod(ListGroups.name, async (): Promise<ListGroups.Return> => {
    const promises: Array<{ group: string, name: string }> = []

    for (const { key: cid, value: database } of groups.all()) {
      promises.push({ group: cid, name: database.manifest.name })
    }

    return Promise.all(promises)
  })
}

export default command
