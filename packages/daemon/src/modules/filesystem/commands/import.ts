import Path from 'path'
import { Import } from '@organicdesign/db-rpc-interfaces'
import { selectChunker, importer } from '@organicdesign/db-utils/portation'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import { CID } from 'multiformats/cid'
import { type Context, logger } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ net, blockstore, heliaPinManager }, context) => {
  net.rpc.addMethod(Import.name, async (raw: unknown): Promise<Import.Return> => {
    const params = Import.Params.parse(raw)
    const encrypt = Boolean(params.encrypt)

    const config = {
      chunker: selectChunker(),
      cidVersion: 1
    } as const

    if (params.onlyHash) {
      throw new Error('no implemented')
    }

    if (!params.onlyHash) {
      logger.info('[add] importing %s', params.inPath)
    }

    const store = params.onlyHash ? new BlackHoleBlockstore() : blockstore

    const cids: Import.Return = []

    for await (const r of importer(store, params.inPath, config)) {
      await heliaPinManager.pinLocal(r.cid)

      logger.info('[add] imported %s', params.inPath)

      // Create the action record.
      const entry = {
        cid: r.cid.bytes,
        encrypted: encrypt,
        priority: params.priority ?? 1,
        revisionStrategy: params.revisionStrategy ?? context.config.defaultRevisionStrategy
      }

      const virtualPath = Path.join(params.path, r.path.replace(params.inPath, ''))

      cids.push({
        inPath: r.path,
        path: virtualPath,
        cid: r.cid.toString()
      })

      await context.uploads.add('put', [CID.parse(params.group).bytes, virtualPath, entry])
    }

    return cids
  })
}

export default command
