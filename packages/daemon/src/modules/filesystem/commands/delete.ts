import { CID } from 'multiformats/cid'
import { Delete } from 'rpc-interfaces'
import type { RPCCommand } from '@/interface.js'
import type createUploadManager from '@/upload-operations.js'

export interface Components {
  uploads: Awaited<ReturnType<typeof createUploadManager>>
}

const command: RPCCommand<Components> = {
  name: Delete.name,

  method: (components: Components) => async (raw: unknown): Promise<Delete.Return> => {
    const params = Delete.Params.parse(raw)
    const pairs = await components.uploads.add('delete', [CID.parse(params.group).bytes, params.path])

    return pairs.map(p => ({ path: p.key, cid: p.value.cid.toString() }))
  }
}

export default command
