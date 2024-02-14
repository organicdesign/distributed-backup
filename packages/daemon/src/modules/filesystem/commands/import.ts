import Path from 'path'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import { selectHasher, selectChunker, importRecursive, type ImporterConfig } from 'fs-importer'
import * as logger from 'logger'
import { CID } from 'multiformats/cid'
import { Import } from 'rpc-interfaces'
import type { Config } from '../index.js'
import type { RPCCommand } from '@/interface.js'
import type createUploadManager from '@/upload-operations.js'
import type { Blockstore } from 'interface-blockstore'
import type { Libp2p } from 'libp2p'
import { encodeEntry, getDagSize } from '@/utils.js'

export interface Components {
  blockstore: Blockstore
  libp2p: Libp2p
  uploads: Awaited<ReturnType<typeof createUploadManager>>
  config: Config
}

const command: RPCCommand<Components> = {
  name: Import.name,

  method: (components: Components) => async (raw: unknown): Promise<Import.Return> => {
    const params = Import.Params.parse(raw)
    const encrypt = Boolean(params.encrypt)

    const config: ImporterConfig = {
      chunker: selectChunker(),
      hasher: selectHasher(),
      cidVersion: 1
    }

    if (!params.onlyHash) {
      logger.add('importing %s', params.inPath)
    }

    const store = params.onlyHash ? new BlackHoleBlockstore() : components.blockstore

    /*
      const cipher = encrypt ? components.cipher : undefined;
      const { cid } = await fsImport(store, params.localPath, config, cipher);

      if (params.onlyHash) {
        return cid;
      }
    */

    const cids: Import.Return = []

    for await (const r of importRecursive(store, params.inPath, config)) {
      logger.add('imported %s', params.inPath)

      const { size, blocks } = await getDagSize(components.blockstore, r.cid)

      // Create the action record.
      const entry = encodeEntry({
        cid: r.cid,
        sequence: 0,
        blocks,
        size,
        encrypted: encrypt,
        timestamp: Date.now(),
        priority: params.priority ?? 1,
        author: components.libp2p.peerId.toCID(),
        revisionStrategy: params.revisionStrategy ?? components.config.defaultRevisionStrategy
      })

      const virtualPath = Path.join(params.path, r.path.replace(params.inPath, ''))

      cids.push({
        inPath: r.path,
        path: virtualPath,
        cid: r.cid.toString()
      })

      await components.uploads.add('put', [CID.parse(params.group).bytes, virtualPath, entry])
    }

    return cids
  }
}

export default command
