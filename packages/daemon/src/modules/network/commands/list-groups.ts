import { type ListGroups } from 'rpc-interfaces'
import { type RPCCommand } from '@/interface.js'
import type { Groups } from "@/groups.js";

export interface Components {
  groups: Groups
}

const command: RPCCommand<Components> = {
  name: 'list-groups',

  method: (components: Components) => async (): Promise<ListGroups.Return> => {
	  const promises: Array<{ group: string, name: string }> = []

	  for (const { key: cid, value: database } of components.groups.all()) {
	    promises.push({ group: cid, name: database.manifest.name })
	  }

	  return Promise.all(promises)
  }
}

export default command
