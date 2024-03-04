import { ListPackages } from '@organicdesign/db-rpc-interfaces'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(ListPackages.name, async (raw: unknown): Promise<ListPackages.Return> => {
    const params = ListPackages.Params.parse(raw)
    const group = CID.parse(params.group)
    const packages = context.getPackages(group)

    if (packages == null) {
      throw new Error('no such group')
    }

    const pkgs = await all(packages.all())

    return pkgs.map(p => ({ name: p.key, cid: p.value.cid.toString() }))
  })
}

export default command
