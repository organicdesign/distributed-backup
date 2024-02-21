import * as logger from 'logger'
import { CID } from 'multiformats/cid'
import { Edit } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(Edit.name, async (raw: unknown): Promise<Edit.Return> => {
    const params = Edit.Params.parse(raw)

    if (params.revisionStrategy !== null) {
      logger.warn('local revision strategy has no effect')
    }

    await context.localSettings.set(CID.parse(params.group), params.path, {
      priority: params.priority,
      revisionStrategy: params.revisionStrategy
    })

    return null
  })
}

export default command
