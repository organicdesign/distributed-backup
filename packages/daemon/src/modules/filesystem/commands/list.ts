import { CID } from 'multiformats/cid'
import { List } from 'rpc-interfaces'
import { toString as uint8arrayToString } from 'uint8arrays'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { groups }) => ({
  name: List.name,

  async method (raw: unknown): Promise<List.Return> {
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

      for await (const pair of fs.getDir(params.path)) {
        const entry = pair.value

        const ref = await context.localSettings.get(
          CID.parse(group),
          pair.key.toString().slice(2)
        )

        list.push({
          path: pair.key.toString(),
          cid: entry.cid.toString(),
          name: entry.cid.toString().slice(0, 8),
          group,
          encrypted: entry.encrypted,
          size: entry.size,
          blocks: entry.blocks,
          priority: ref?.priority ?? entry.priority,
          revisionStrategy: ref?.revisionStrategy ?? entry.revisionStrategy,
          timestamp: entry.timestamp,
          author: uint8arrayToString(entry.author.bytes, 'base58btc')
        })
      }
    }

    return list
  }
})

export default command
