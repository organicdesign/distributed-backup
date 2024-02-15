import * as logger from 'logger'
import { CID } from 'multiformats/cid'
import { Edit } from 'rpc-interfaces'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: Edit.name,

  async method (raw: unknown): Promise<Edit.Return> {
    const params = Edit.Params.parse(raw)

    if (params.revisionStrategy !== null) {
      logger.warn('local revision strategy has no effect')
    }

    await context.localSettings.set(CID.parse(params.group), params.path, {
      priority: params.priority,
      revisionStrategy: params.revisionStrategy
    })

    return null
  }
})

export default command
