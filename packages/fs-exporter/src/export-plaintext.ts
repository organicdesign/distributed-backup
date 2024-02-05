import fs from 'fs/promises'
import Path from 'path'
import * as dagPb from '@ipld/dag-pb'
import { defaultDagWalkers } from 'dag-walkers'
import { UnixFS } from 'ipfs-unixfs'
import * as logger from 'logger'
import { type CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import type { Blockstore } from 'interface-blockstore'

const dagWalkers = defaultDagWalkers()

export default async (blockstore: Blockstore, path: string, cid: CID): Promise<void> => {
  await fs.mkdir(path.split('/').slice(0, -1).join('/'), { recursive: true })

  const walk = async (cid: CID, path: string): Promise<void> => {
    const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code)

    if (dagWalker == null) {
      throw new Error(`No dag walker found for cid codec ${cid.code}`)
    }

    const block = await blockstore.get(cid)

    const data = dagPb.decode(block)

    if (data.Data == null) {
      throw new Error('data is null')
    }

    if (cid.code === raw.code) {
      await fs.appendFile(path, data.Data)
      return
    }

    const fsData = UnixFS.unmarshal(data.Data)

    if (fsData.isDirectory()) {
      await fs.mkdir(path)

      for (const link of data.Links) {
        if (link.Name == null) {
          logger.warn('link is missing name')
          continue
        }

        await walk(link.Hash, Path.join(path, link.Name))
      }
    } else {
      if (fsData.data != null) {
        await fs.appendFile(path, fsData.data)
      }

      for (const link of data.Links) {
        await walk(link.Hash, path)
      }
    }
  }

  await walk(cid, path)
}
