import fs from 'fs'
import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { getSize } from '@organicdesign/db-utils/dag'
import { selectChunker } from '@organicdesign/db-utils/portation'
import { FsBlockstore } from 'blockstore-fs'
import { FsDatastore } from 'datastore-fs'
import { createHelia, type HeliaInit } from 'helia'
import all from 'it-all'
import createLibp2p from '../utils/libp2p.js'
import type { ImplementationCreator } from './interface.js'

export const createHeliaBench: ImplementationCreator = async (path, data, options = {}) => {
  const paths = [...Array(2).keys()].map(i => Path.join(path, `helia-${i}`))

  const helias = await Promise.all(paths.map(async path => {
    const libp2p = await createLibp2p(
      options.persistent === true ? new FsDatastore(Path.join(path, 'libp2p-datastore')) : undefined
    )

    const heliaInit: Partial<HeliaInit> = { libp2p }

    if (options.persistent === true) {
      heliaInit.blockstore = new FsBlockstore(Path.join(path, 'blockstore'))
      heliaInit.datastore = new FsDatastore(Path.join(path, 'datastore'))
    }

    return createHelia(heliaInit)
  }))

  const ufss = helias.map(h => unixfs(h))

  const addresses = helias[0].libp2p.getMultiaddrs()

  await helias[1].libp2p.dial(addresses)

  const cid = await ufss[0].addFile(
    { content: fs.createReadStream(data) },
    { chunker: selectChunker(options.chunker) }
  )

  const item = await getSize(helias[0].blockstore, cid)

  return {
    blocks: item.blocks,
    size: item.size,

    async teardown () {
      await Promise.all(helias.map(async h => h.stop()))
    },

    async run () {
      await all(helias[1].pins.add(cid))
    }
  }
}
