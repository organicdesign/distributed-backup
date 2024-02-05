import Path from 'path'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import { selectHasher, selectChunker, importRecursive, type ImporterConfig } from 'fs-importer'
import * as logger from 'logger'
import { CID } from 'multiformats/cid'
import { z } from 'zod'
import { type Components, zCID, ImportOptions, RevisionStrategies } from '../../interface.js'
import { encodeEntry, getDagSize } from '../../utils.js'

export const name = 'add'

const Params = ImportOptions.partial().extend(z.object({
  path: z.string(),
  group: zCID,
  localPath: z.string(),
  onlyHash: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
  versionCount: z.number().optional(),
  priority: z.number().optional(),
  revisionStrategy: RevisionStrategies.optional()
}).shape)

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)
  const encrypt = Boolean(params.encrypt)

  const config: ImporterConfig = {
    chunker: selectChunker(),
    hasher: selectHasher(),
    cidVersion: 1
  }

  if (params.onlyHash !== true) {
    logger.add('importing %s', params.localPath)
  }

  const store = params.onlyHash === true ? new BlackHoleBlockstore() : components.blockstore

  /*
    const cipher = encrypt ? components.cipher : undefined;
    const { cid } = await fsImport(store, params.localPath, config, cipher);

    if (params.onlyHash) {
      return cid;
    }
  */

  const cids: Array<{ cid: string, path: string }> = []

  for await (const r of importRecursive(store, params.localPath, config)) {
    logger.add('imported %s', params.localPath)

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

    const path = Path.join(params.path, r.path.replace(params.localPath, ''))

    cids.push({
      path,
      cid: r.cid.toString()
    })

    await components.uploads.add('put', [CID.parse(params.group).bytes, path, entry])
  }

  return cids

  // return cid.toString();
}
