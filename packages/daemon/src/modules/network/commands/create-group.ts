import { CreateGroup } from 'rpc-interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import type { RPCCommand } from '@/interface.js'
import type { Welo } from "welo";
import type { Groups } from '@/groups.js'

export interface Components {
	welo: Welo
	groups: Groups
}

const command: RPCCommand<Components> = {
  name: 'create-group',

  method: (components: Components) => async (raw: unknown): Promise<CreateGroup.Return> => {
    const params = CreateGroup.Params.parse(raw)
    const peerValues = params.peers.map(p => uint8ArrayFromString(p, 'base58btc'))

    const manifest = await components.welo.determine({
      name: params.name,
      meta: { type: 'group' },
      access: {
        protocol: '/hldb/access/static',
        config: { write: [components.welo.identity.id, ...peerValues] }
      }
    })

    await components.groups.add(manifest)

    return manifest.address.cid.toString()
  }
}

export default command;
