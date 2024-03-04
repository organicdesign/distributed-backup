import Path from 'path'
import { exportPlaintext } from '@organicdesign/db-fs-exporter'
import { ExportPackage } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, network }) => {
  rpc.addMethod(ExportPackage.name, async (raw: unknown): Promise<ExportPackage.Return> => {
    const params = ExportPackage.Params.parse(raw)
    const group = CID.parse(params.group)
    const packages = context.getPackages(group)

    if (packages == null) {
      throw new Error('no such group')
    }

    const pkg = await packages.get(params.name)

    if (pkg == null) {
      throw new Error('no such package')
    }

    const path = Path.join(params.path, `${params.name}.tar`)

    await exportPlaintext(
      network.helia.blockstore,
      path,
      pkg.cid
    )

    return path
  })
}

export default command
