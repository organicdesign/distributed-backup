import fs from 'fs'
import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { getSize } from '@organicdesign/db-utils/dag'
import { FsBlockstore } from 'blockstore-fs'
import { FsDatastore } from 'datastore-fs'
import { createHelia, type HeliaInit } from 'helia'
import type { ImplementationCreator } from './interface.js'

export const createHeliaBench: ImplementationCreator = async (path, data, persistent) => {
  const heliaInit: HeliaInit = {}

  if (persistent) {
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
      const cid = await ufs.addFile({ content: fs.createReadStream(data) })
      const { blocks, size } = await getSize(helia.blockstore, cid)

      return { cid: cid.toString(), blocks, size }
    }
  }
}
