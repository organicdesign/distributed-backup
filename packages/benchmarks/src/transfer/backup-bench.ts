import Path from 'path'
import { Client } from '@organicdesign/db-client'
import runNode from '../utils/run-node.js'
import type { ImplementationCreator } from './interface.js'

export const createBackupBench: ImplementationCreator = async (path, data, options = {}) => {
  const nodePaths = [...Array(2).keys()].map(i => Path.join(path, `node-${i}`))
  const procs = await Promise.all(nodePaths.map(async p => runNode(p, options)))

  await Promise.all(procs.map(async p => p.start()))

  const clients = procs.map(p => new Client(p.socket))
  const addresses = await clients[0].addresses()

  await clients[1].connect(addresses[0])

  const group = await clients[0].createGroup('test')
  const [{ cid }] = await clients[0].import(group, data, { path: '/test', chunker: options.chunker })
  const item = await clients[0].getState(cid)
  await clients[1].downloader({ pause: true })
  await clients[1].joinGroup(group)
  await clients[1].sync()

  return {
    blocks: item.blocks,
    size: item.size,

    async teardown () {
      for (const client of clients) {
        client.stop()
      }

      await Promise.all(procs.map(async p => p.stop()))
    },

    async run () {
      await clients[1].downloader({ pause: false })

      for (;;) {
        const { status } = await clients[1].getState(cid)

        if (status === 'COMPLETED') {
          break
        }

        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
  }
}
