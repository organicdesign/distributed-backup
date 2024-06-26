import { CustomEvent } from '@libp2p/interface'
import { Write } from '@organicdesign/db-rpc-interfaces'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Context } from '../index.js'
import type { Entry } from '../interface.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ rpcServer, unixfs, events }, context) => {
  rpcServer.rpc.addMethod(Write.name, async (raw: unknown): Promise<Write.Return> => {
    const params = Write.Params.parse(raw)
    const group = CID.parse(params.group)
    const fs = context.getFileSystem(CID.parse(params.group))

    if (fs == null) {
      throw new Error('no such group')
    }

    const entry: Partial<Entry> = await fs.get(params.path) ?? {}

    const existingData = (entry.cid != null) ? uint8ArrayConcat(await all(unixfs.cat(entry.cid))) : new Uint8Array()

    const dataToWrite = uint8ArrayConcat([
      existingData.slice(0, params.position),
      uint8ArrayFromString(params.data),
      existingData.slice(params.position + params.length)
    ])

    const cid = await unixfs.addBytes(dataToWrite)

    const newEntryParams = {
      cid,
      encrypted: false,
      priority: entry?.priority ?? 100,
      revisionStrategy: entry.revisionStrategy ?? context.config.defaultRevisionStrategy
    }

    const newEntry = await fs.put(params.path, newEntryParams)

    events.dispatchEvent(new CustomEvent('file:added', { detail: { group, path: params.path, entry: newEntry } }))

    return params.data.length
  })
}

export default command
