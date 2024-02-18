import Path from 'path'
import { exportPlaintext } from 'fs-exporter'
import { CID } from 'multiformats/cid'
import { Export } from 'rpc-interfaces'
import { FileSystem } from '../file-system.js'
import { createDataKey } from '../utils.js'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { base, groups }) => ({
  name: Export.name,

  async method (raw: unknown): Promise<Export.Return> {
    const params = Export.Params.parse(raw)
    const database = groups.groups.get(CID.parse(params.group))

    if (database == null) {
      throw new Error('no such group')
    }

    const fs = new FileSystem(context.pinManager, database)

    for await (const pair of fs.getDir(createDataKey(params.path))) {
      const virtualPath = pair.key.toString().replace('/r', '')

      await exportPlaintext(
        base.blockstore,
        Path.join(params.outPath, virtualPath.replace(params.path, '')),
        pair.value.cid
      )
    }

    return null
  }
})

export default command
