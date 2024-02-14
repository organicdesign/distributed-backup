import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { exportPlaintext } from 'fs-exporter'
import { CID } from 'multiformats/cid'
import { Export } from 'rpc-interfaces'
import { type RPCCommand, EncodedEntry } from '@/interface.js'
import { decodeEntry, createDataKey } from '@/utils.js'
import type { Groups } from "@/groups.js"
import type { Blockstore } from 'interface-blockstore'

export interface Components {
  groups: Groups
  blockstore: Blockstore
}

const command: RPCCommand<Components> = {
  name: 'export',

  method: (components: Components) => async (raw: unknown): Promise<Export.Return> => {
	  const params = Export.Params.parse(raw)
	  const database = components.groups.get(CID.parse(params.group))

	  if (database == null) {
	    throw new Error('no such group')
	  }

	  const index = await database.store.latest()

	  for await (const pair of index.query({ prefix: createDataKey(params.path) })) {
	    const encodedEntry = EncodedEntry.parse(dagCbor.decode(pair.value))

	    if (encodedEntry == null) {
	      continue
	    }

	    const entry = decodeEntry(encodedEntry)
	    const virtualPath = pair.key.toString().replace('/r', '')

	    await exportPlaintext(
	      components.blockstore,
	      Path.join(params.outPath, virtualPath.replace(params.path, '')),
	      entry.cid
	    )
	  }

	  return null
  }
}

export default command
