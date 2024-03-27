import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { type RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { take } from 'streaming-iterables'
import { FileSystemEvent } from './events.js'
import type { Context } from './index.js'
import type { Entry } from './interface.js'
import type { Components } from '@/common/interface.js'
import type { Pair } from '@/interface.js'
import type { Datastore } from 'interface-datastore'
import { OperationManager } from '@/operation-manager.js'

export default async (context: Pick<Context, 'getFileSystem' | 'events'>, { pinManager, helia }: Components, datastore: Datastore): Promise<OperationManager<{
  put(groupData: Uint8Array, path: string, encodedEntry: { cid: Uint8Array, encrypted: boolean, revisionStrategy: RevisionStrategies, priority: number }): Promise<void>
  delete(groupData: Uint8Array, path: string): Promise<Array<Pair<string, Entry>>>
}>> => {
  const put = async (groupData: Uint8Array, path: string, entry: { cid: Uint8Array, encrypted: boolean, revisionStrategy: RevisionStrategies, priority: number }): Promise<void> => {
    const group = CID.decode(groupData)
    const fs = context.getFileSystem(group)
    const cid = CID.decode(entry.cid)

    if (fs == null) {
      throw new Error('unable to get group')
    }

    const fullEntry = await fs.put(path, { ...entry, cid })
    await pinManager.put(path, { cid, priority: entry.priority })

    context.events.dispatchEvent(new FileSystemEvent('file:added', group, path, fullEntry))
  }

  const om = new OperationManager(datastore, {
    put,

    async delete (groupData: Uint8Array, path: string) {
      const fs = context.getFileSystem(CID.decode(groupData))

      if (fs == null) {
        throw new Error('no such group')
      }

      const parentPath = path.split('/').slice(0, -2).join('/')
      const ufs = unixfs(helia)
      const cid = await ufs.addBytes(new Uint8Array([]))
      const pairs = await all(fs.getDir(path))

      for await (const p of pairs) {
        await fs.delete(p.key.toString())
      }

      const values = await all(take(1)(fs.getDir(parentPath)))

      if (values.filter(v => v.key.toString() !== path).length === 0) {
        await put(groupData, Path.join(parentPath, '.PLACE_HOLDER'), {
          cid: cid.bytes,
          encrypted: false,
          priority: 100,
          revisionStrategy: 'none'
        })
      }

      return pairs
    }
  })

  await om.start()

  return om
}
