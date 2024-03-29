import Path from 'path'
import { Export } from '@organicdesign/db-rpc-interfaces'
import { exporter } from '@organicdesign/db-utils'
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
      await exporter(
        base.blockstore,
        Path.join(params.outPath, pair.key.toString().replace(params.path, '')),
        pair.value.cid
      )
    }

    return null
  })
}

export default command
