import Path from 'path'
import { selectHasher, selectChunker, importRecursive, type ImporterConfig } from '@organicdesign/db-fs-importer'
import { Import } from '@organicdesign/db-rpc-interfaces'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import { CID } from 'multiformats/cid'
import { type Provides, type Requires, logger } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, network, base }) => {
  rpc.addMethod(Import.name, async (raw: unknown): Promise<Import.Return> => {
    const params = Import.Params.parse(raw)
    const encrypt = Boolean(params.encrypt)

    const config: ImporterConfig = {
      chunker: selectChunker(),
      hasher: selectHasher(),
      cidVersion: 1
    }

    if (!params.onlyHash) {
      logger.info('[add] importing %s', params.inPath)
    }

    const store = params.onlyHash ? new BlackHoleBlockstore() : base.blockstore

    /*
      const cipher = encrypt ? components.cipher : undefined;
      const { cid } = await fsImport(store, params.localPath, config, cipher);

      if (params.onlyHash) {
        return cid;
      }
    */

    const cids: Import.Return = []

    for await (const r of importRecursive(store, params.inPath, config)) {
      await network.pinManager.pinLocal(r.cid)

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
