import * as logger from 'logger'
import { CID } from 'multiformats/cid'
import { Edit } from 'rpc-interfaces'
import type { RPCCommand } from '@/interface.js'
import type { LocalSettings } from '@/local-settings.js'

export interface Components {
  localSettings: LocalSettings
}

const command: RPCCommand<Components> = {
  name: 'edit',

  method: (components: Components) => async (raw: unknown): Promise<Edit.Return> => {
	  const params = Edit.Params.parse(raw)

	  if (params.revisionStrategy !== null) {
	    logger.warn('local revision strategy has no effect')
	  }

	  await components.localSettings.set(CID.parse(params.group), params.path, {
	    priority: params.priority,
	    revisionStrategy: params.revisionStrategy
	  })

	  return null
  }
}

export default command;
