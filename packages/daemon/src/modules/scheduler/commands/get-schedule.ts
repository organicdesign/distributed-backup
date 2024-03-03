import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (_, { rpc }) => {
  rpc.addMethod('get-schedule', async (_: unknown): Promise<null> => {
    throw new Error('not implemented')
  })
}

export default command
