import { Client } from '@organicdesign/db-client'
import runNode from '../utils/run-node.js'
import type { ImplementationCreator } from './interface.js'

export const createBackupBench: ImplementationCreator = async (path, data, options = {}) => {
  const proc = await runNode(path, options)

  await proc.start()

  const client = new Client(proc.socket)
  const group = await client.createGroup('test')

  return {
    async teardown () {
      client.stop()

      await proc.stop()
    },

    async run () {
      const [{ cid }] = await client.import(group, data, { path: '/test', chunker: options.chunker })
      const [item] = await client.getState([cid])

      return item
    }
  }
}
