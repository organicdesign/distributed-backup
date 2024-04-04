import Path from 'path'
import { Client } from '@organicdesign/db-client'
import { packagePath } from '../utils/paths.js'
import runNode from '../utils/run-node.js'
import type { TransferBenchmark } from './interface.js'

export const createTransferBench = async (size: number): Promise<TransferBenchmark> => {
  const dataPath = Path.join(packagePath, 'test-out')

  const names = [...Array(2).keys()].map(i => `transfer-${size}-${i}`)

  const procs = await Promise.all(names.map(async n => runNode(n)))

  await Promise.all(procs.map(async p => p.start()))

  const clients = names.map(n => new Client(Path.join(dataPath, n, `socket`)))

  const addresses = await clients[0].addresses()

  await clients[1].connect(addresses[0])

  const group = await clients[0].createGroup('test')

  const dataFile = Path.join(dataPath, `${size}.data`)
  const [{ cid }] = await clients[0].import(group, dataFile)
  const [item] = await clients[0].getStatus([cid])

  return {
    blocks: item.blocks,
    size: item.size,

    async teardown () {
      for (const client of clients) {
        client.stop()
      }

      await Promise.all(procs.map(async p => p.stop()))
    },

    async warmup () {
      await clients[1].joinGroup(group)
      await clients[1].sync()
    },

    async run () {
      for (;;) {
        const [{ state }] = await clients[1].getStatus([cid])

        if (state === 'COMPLETED') {
          break
        }

        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
  }
}
