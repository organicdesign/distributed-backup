import fs from 'fs'
import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { getSize } from '@organicdesign/db-utils/dag'
import { selectChunker } from '@organicdesign/db-utils/portation'
import { FsBlockstore } from 'blockstore-fs'
import { FsDatastore } from 'datastore-fs'
import { createHelia, type HeliaInit } from 'helia'
import createLibp2p from '../utils/libp2p.js'
import type { ImplementationCreator } from './interface.js'

export const createHeliaBench: ImplementationCreator = async (path, data, options = {}) => {
  const libp2p = await createLibp2p(
    options.persistent === true ? new FsDatastore(Path.join(path, 'libp2p-datastore')) : undefined
  )

  const heliaInit: Partial<HeliaInit> = { blockBrokers: [], libp2p }

  if (options.persistent === true) {
    heliaInit.blockstore = new FsBlockstore(Path.join(path, 'blockstore'))
    heliaInit.datastore = new FsDatastore(Path.join(path, 'datastore'))
  }

  const helia = await createHelia(heliaInit)
  const ufs = unixfs(helia)

  return {
    async teardown () {
      await helia.stop()
    },

    async run () {
      const cid = await ufs.addFile(
        { content: fs.createReadStream(data) },
        { chunker: selectChunker(options.chunker) }
      )

      const { blocks, size } = await getSize(helia.blockstore, cid)

      return { cid: cid.toString(), blocks, size }
    }
  }
}
