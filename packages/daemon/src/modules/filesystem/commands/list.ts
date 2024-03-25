import { List } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import { toString as uint8arrayToString } from 'uint8arrays'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, groups }) => {
  rpc.addMethod(List.name, async (raw: unknown): Promise<List.Return> => {
    const params = List.Params.parse(raw)
    const list: List.Return = []

    for (const { key: group } of groups.groups.all()) {
      if (params.group != null && group !== params.group) {
        continue
      }

      const fs = context.getFileSystem(CID.parse(group))

      if (fs == null) {
        continue
      }

      for await (const { key, value: entry } of fs.getDir(params.path)) {
        list.push({
          path: key.toString(),
          cid: entry.cid.toString(),
          name: entry.cid.toString().slice(0, 8),
          group,
          encrypted: entry.encrypted,
          size: entry.size,
          blocks: entry.blocks,
          priority: entry.priority,
          revisionStrategy: entry.revisionStrategy,
          timestamp: entry.timestamp,
          author: uint8arrayToString(entry.author, 'base58btc')
        })
      }
    }

    return list
  })
}

export default command
