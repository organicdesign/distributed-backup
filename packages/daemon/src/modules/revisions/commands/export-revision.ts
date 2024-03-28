import Path from 'path'
import { ExportRevision } from '@organicdesign/db-rpc-interfaces'
import { exporter } from '@organicdesign/db-utils'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Context } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ net, blockstore }, context) => {
  net.rpc.addMethod(ExportRevision.name, async (raw: unknown): Promise<ExportRevision.Return> => {
    const params = ExportRevision.Params.parse(raw)
    const group = CID.parse(params.group)
    const revisions = context.getRevisions(group)

    if (revisions == null) {
      throw new Error('no such group')
    }

    const author = uint8ArrayFromString(params.author, 'base58btc')

    for await (const { path } of revisions.getAll(params.path)) {
      const outFile = Path.join(params.outPath, path.replace(params.path, ''))
      const revision = await revisions.get(path, author, params.sequence)

      if (revision == null) {
        continue
      }

      await exporter(
        blockstore,
        outFile,
        revision.cid
      )
    }

    return null
  })
}

export default command
