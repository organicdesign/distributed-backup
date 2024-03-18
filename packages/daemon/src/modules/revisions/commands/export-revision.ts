import Path from 'path'
import { exporter } from '@organicdesign/db-fs-exporter'
import { ExportRevision } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, base, filesystem }) => {
  rpc.addMethod(ExportRevision.name, async (raw: unknown): Promise<ExportRevision.Return> => {
    const params = ExportRevision.Params.parse(raw)
    const group = CID.parse(params.group)
    const revisions = context.getRevisions(group)
    const fs = filesystem.getFileSystem(group)

    if (revisions == null || fs == null) {
      throw new Error('no such group')
    }

    const author = uint8ArrayFromString(params.author, 'base58btc')

    for await (const pair of fs.getDir(params.path)) {
      const path = pair.key.toString()
      const outFile = Path.join(params.outPath, path.replace(params.path, ''))
      const revision = await revisions.get(path, author, params.sequence)

      if (revision == null) {
        continue
      }

      await exporter(
        base.blockstore,
        outFile,
        revision.cid
      )
    }

    return null
  })
}

export default command
