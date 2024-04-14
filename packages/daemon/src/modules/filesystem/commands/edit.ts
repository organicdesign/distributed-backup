import Path from 'path'
import { Edit } from '@organicdesign/db-rpc-interfaces'
import { type Context, logger } from '../index.js'
import { pathToKey } from '../utils.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ rpcServer, pinManager }) => {
  rpcServer.rpc.addMethod(Edit.name, async (raw: unknown): Promise<Edit.Return> => {
    const params = Edit.Params.parse(raw)

    if (params.revisionStrategy !== null) {
      logger.warn('local revision strategy has no effect')
    }

    if (params.priority != null) {
      const key = Path.join('/', params.group, pathToKey(params.path))
      const pin = await pinManager.get(key)

      if (pin != null) {
        await pinManager.put(key, { ...pin, priority: params.priority })
      }
    }

    return null
  })
}

export default command
