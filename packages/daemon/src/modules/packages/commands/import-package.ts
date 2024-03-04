import { selectHasher, selectChunker, importPlaintext, type ImporterConfig } from '@organicdesign/db-fs-importer'
import { ImportPackage } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, base }) => {
  rpc.addMethod(ImportPackage.name, async (raw: unknown): Promise<ImportPackage.Return> => {
    const params = ImportPackage.Params.parse(raw)
    const group = CID.parse(params.group)
    const packages = context.getPackages(group)

    if (packages == null) {
      throw new Error('no such group')
    }

    const config: ImporterConfig = {
      chunker: selectChunker(),
      hasher: selectHasher(),
      cidVersion: 1
    }

    const parts = params.path.split('/')
    const name = parts[parts.length - 1].replace('.tar', '')
    const result = await importPlaintext(base.blockstore, params.path, config)

    await packages.put(name, result.cid)

    return { cid: result.cid.toString(), name }
  })
}

export default command
