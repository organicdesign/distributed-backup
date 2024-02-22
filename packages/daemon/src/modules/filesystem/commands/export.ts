import Path from 'path'
import { exportPlaintext } from '@organicdesign/db-fs-exporter'
import { Export } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, base }) => {
  rpc.addMethod(Export.name, async (raw: unknown): Promise<Export.Return> => {
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
  })
}

export default command
