import fs from 'fs/promises'
import Path from 'path'
import { Client } from '@organicdesign/db-client'
import generateFile from './utils/generate-file.js'
import { packagePath } from './utils/paths.js'
import runNode from './utils/run-node.js'

const dataPath = Path.join(packagePath, 'test-out')
const name = 'transfer'

const procs = await Promise.all([
  runNode(`${name}-0`),
  runNode(`${name}-1`)
])

await Promise.all(procs.map(async p => p.start()))

const clients = [
  new Client(Path.join(packagePath, `${name}-0.socket`)),
  new Client(Path.join(packagePath, `${name}-1.socket`))
]

const addresses = await clients[0].addresses()

await clients[1].connect(addresses[0])

const group = await clients[0].createGroup('test')

await fs.mkdir(dataPath, { recursive: true })

const kbTestPath = Path.join(dataPath, '1kb.data')
await generateFile(kbTestPath, 2 ** 10)

const [{ cid }] = await clients[0].import(group, kbTestPath)

await clients[1].joinGroup(group)
await clients[1].sync()

const start = Date.now()

for (;;) {
  const [{ state }] = await clients[1].getStatus([cid])

  if (state === 'COMPLETED') {
    break
  }
}

const time = Date.now() - start

// eslint-disable-next-line no-console
console.log(`benchmark 1kb: ${time}ms`)

for (const client of clients) {
  client.stop()
}

await Promise.all(procs.map(async p => p.stop()))
