import Path from 'path'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import { selectHasher, selectChunker, importRecursive, type ImporterConfig } from 'fs-importer'
import * as logger from 'logger'
import { CID } from 'multiformats/cid'
import { Import } from 'rpc-interfaces'
import { encodeEntry, getDagSize } from '../../utils.js'
import type { Components } from '../../interface.js'

export const name = 'import'

export const method = (components: Components) => async (raw: unknown): Promise<Import.Return> => {
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