import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'list'

export const desc = 'List all items.'

export const builder = createBuilder({
  age: {
    type: 'number',
    default: 60000
  }
})

const formatSize = (size: number): string => {
  if (size > Math.pow(1000, 3)) {
    return `${Math.floor((size * 10) / Math.pow(1000, 3)) / 10} GB`
  }

  if (size > Math.pow(1000, 2)) {
    return `${Math.floor((size * 10) / Math.pow(1000, 2)) / 10} MB`
  }

  if (size > Math.pow(1000, 1)) {
    return `${Math.floor((size * 10) / Math.pow(1000, 1)) / 10} KB`
  }

  if (size > Math.pow(1000, 0)) {
    return `${Math.floor((size * 10) / Math.pow(1000, 0)) / 10} B`
  }

  return `${size} B`
}

const formatPercent = (decimal: number): string => {
  const percent = Math.floor(decimal * 1000) / 10

  return `${isNaN(percent) ? 0 : percent}%`
}

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const items = await argv.client.list()
  const revisionCounter: Record<string, number> = {}

  items.sort((a, b) => a.path.localeCompare(b.path))

  const total = {
    blocks: items.reduce((a, b) => a + b.blocks, 0),
    size: items.reduce((a, b) => a + b.size, 0),
    count: items.length
  }

  if (argv.json === true) {
    yield JSON.stringify({
      items,
      total
    })

    return
  }

  const completed = {
    blocks: 0,
    size: 0,
    count: 0,
    speed: 0
  }

  const getItemData = async (cid: string): Promise<{
    speed: number
    peers: number
    status: string
    blocks: number
    size: number
  }> => {
    if (argv.client == null) {
      throw new Error('Failed to connect to daemon.')
    }

    const [[{ status, blocks, size }], [agedStateData], [{ peers }]] = await Promise.all([
      argv.client.getState([cid]),
      argv.client.getState([cid], { age: argv.age }),
      argv.client.countPeers([cid])
    ])

    const speed = agedStateData.size / (argv.age / 1000)

    if (status === 'COMPLETED') {
      completed.count++
    }

    completed.blocks += blocks
    completed.size += size
    completed.speed += speed

    return { speed, peers, status, blocks, size }
  }

  const getDataFuncs = items.map(item => async () => ({
    item,
    state: await getItemData(item.cid)
  }))

  yield [
    'Name'.padEnd(50),
    'Size'.padEnd(27),
    'Speed'.padEnd(27),
    'Blocks'.padEnd(20),
    'State'.padEnd(15),
    'Priority'.padEnd(10),
    'Revisions'.padEnd(10),
    'Peers'.padEnd(10),
    'Group'.padEnd(10),
    'Encrypted'.padEnd(10),
    'R-Strategy'.padEnd(12),
    'CID'.padEnd(62)
  ].join('')

  yield ''

  yield * pipe(
    getDataFuncs,
    i => parallel(i, { ordered: false, concurrency: 5 }),
    async function * (items) {
      for await (const { item, state } of items) {
        const timeRemaining = Math.ceil((item.size - state.size) / state.speed)

        yield [
          `${item.path}`.slice(0, 48).padEnd(50),
          `${formatSize(state.size)}/${formatSize(item.size)} (${formatPercent(state.size / item.size)})`.slice(0, 25).padEnd(27),
          `${formatSize(state.speed)}/s ${isNaN(timeRemaining) ? '' : `(${timeRemaining} s)`}`.slice(0, 25).padEnd(27),
          `${state.blocks}/${item.blocks} (${formatPercent(state.blocks / item.blocks)})`.slice(0, 18).padEnd(20),
          state.status.slice(0, 13).padEnd(15),
          `${item.priority}`.slice(0, 8).padEnd(10),
          `${revisionCounter[item.path] ?? 0}`.slice(0, 8).padEnd(10),
          `${state.peers}`.slice(0, 8).padEnd(10),
          `${item.group}`.slice(0, 8).padEnd(10),
          `${item.encrypted}`.slice(0, 8).padEnd(10),
          `${item.revisionStrategy}`.slice(0, 8).padEnd(12),
          item.cid.padEnd(62)
        ].join('')
      }
    }
  )

  yield ''
  yield [
    'Total'.padEnd(15),
    'Size'.padEnd(25),
    'Blocks'.padEnd(20),
    'Speed'.padEnd(20)
  ].join('')

  yield [
    `${completed.count}/${total.count} (${formatPercent(completed.count / total.count)})`.slice(0, 13).padEnd(15),
    `${formatSize(completed.size)}/${formatSize(total.size)} (${formatPercent(completed.size / total.size)})`.slice(0, 23).padEnd(25),
    `${completed.blocks}/${total.blocks} (${formatPercent(completed.blocks / total.blocks)})`.slice(0, 18).padEnd(20),
    `${formatSize(completed.speed)}s`.slice(0, 18).padEnd(20)
  ].join('')
})
