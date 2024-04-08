import Path from 'path'
import { Client } from '@organicdesign/db-client'
import { packagePath } from '../utils/paths.js'
import runNode from '../utils/run-node.js'
import type { ImportBenchmark } from './interface.js'

export const createImportBench = async (size: number, persistent: boolean): Promise<ImportBenchmark> => {
  const dataPath = Path.join(packagePath, 'test-out')

  const name = `import-${size}`

  const proc = await runNode(name, { persistent })

  await proc.start()

  const client = new Client(Path.join(dataPath, name, 'socket'))

  const group = await client.createGroup('test')

  const dataFile = Path.join(dataPath, `${size}.data`)

  return {
    async teardown () {
      client.stop()

      await proc.stop()
    },

    async run () {
      const [{ cid }] = await client.import(group, dataFile, { path: '/test' })
      const [item] = await client.getStatus([cid])

      return item
    }
  }
}
