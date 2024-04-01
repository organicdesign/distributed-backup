import fs from 'fs/promises'
import Path from 'path'
import { exporter as ufsExporter } from 'ipfs-unixfs-exporter'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

export const exporter = async (blockstore: Blockstore, path: string, cid: CID): Promise<void> => {
  const e = await ufsExporter(cid, blockstore)

  if (e.type === 'file') {
    await fs.mkdir(path, { recursive: true })
    await fs.writeFile(Path.join(path, e.name), e.content())
    return
  }

  if (e.type === 'raw') {
    await fs.mkdir(Path.join(path, '..'), { recursive: true })
    await fs.writeFile(path, e.content())
  }

  if (e.type === 'directory') {
    for (const link of e.node.Links) {
      await exporter(blockstore, Path.join(path, link.Name ?? ''), link.Hash)
    }
  }
}
