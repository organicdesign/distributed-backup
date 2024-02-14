import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import { Read } from 'rpc-interfaces'
import { collect } from 'streaming-iterables'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Groups } from '@/groups.js'
import type { RPCCommand, EncodedEntry } from '@/interface.js'
import type { Helia } from 'helia'
import { decodeEntry, createDataKey } from '@/utils.js'

export interface Components {
  groups: Groups
  helia: Helia
}

const command: RPCCommand<Components> = {
  name: Read.name,

  method: (components: Components) => async (raw: unknown): Promise<Read.Return> => {
    const params = Read.Params.parse(raw)
    const group = components.groups.get(CID.parse(params.group))

    if (group == null) {
      throw new Error('no such group')
    }

    const key = createDataKey(params.path)
    const encodedEntry = await group.store.selectors.get(group.store.index)(key) as EncodedEntry

    if (encodedEntry == null) {
      throw new Error(`no such item: ${key}`)
    }

    const entry = decodeEntry(encodedEntry)
    const fs = unixfs(components.helia)

    return uint8ArrayToString(uint8ArrayConcat(await collect(fs.cat(entry.cid, { offset: params.position, length: params.length }))))
  }
}

export default command
