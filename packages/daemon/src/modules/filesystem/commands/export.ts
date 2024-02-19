import Path from 'path'
import { exportPlaintext } from 'fs-exporter'
import { CID } from 'multiformats/cid'
import { Export } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { base }) => ({
  name: Export.name,

  async method (raw: unknown): Promise<Export.Return> {
    const params = Export.Params.parse(raw)
    const fs = context.getFileSystem(CID.parse(params.group))

    if (fs == null) {
      throw new Error('no such group')
    }

    for await (const pair of fs.getDir(params.path)) {
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
