import { Client } from '@organicdesign/db-client'
import runNode from '../utils/run-node.js'
import type { ImportBenchmark } from './interface.js'

export const createBackupBench = async (path: string, data: string, persistent: boolean): Promise<ImportBenchmark> => {
  const proc = await runNode(path, { persistent })

  await proc.start()

  const client = new Client(proc.socket)
  const group = await client.createGroup('test')

  return {
    async teardown () {
      client.stop()

      await proc.stop()
    },

    async run () {
      const [{ cid }] = await client.import(group, data, { path: '/test' })
      const [item] = await client.getState([cid])

      return item
    }
  }
}
