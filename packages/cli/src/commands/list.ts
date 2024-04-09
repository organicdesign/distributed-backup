import { List } from '@organicdesign/db-rpc-interfaces'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'list'

export const desc = 'List all items.'

export const builder = createBuilder({})

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

type JStruct = { [k in string]: JStruct | List.Return[number] }

const createJSON = (items: List.Return): JStruct => {
  const struct: JStruct = {}

  for (const item of items) {
    const parts = item.path.split('/').filter(p => p.length !== 0)
    const last = parts.pop()
    let itr = struct

    for (const part of parts) {
      if (itr[part] == null) {
        itr[part] = {}
      }

      itr = itr[part] as JStruct
    }

    itr[last ?? ''] = item
  }

  return struct
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

  const states = await argv.client.getState(items.map(i => i.cid))

  const getState = ({ cid }: { cid: string }): (typeof states)[number] =>
    states.find(s => s.cid === cid) ?? { status: 'NOTFOUND', blocks: 0, size: 0, cid }

  const peers = await argv.client.countPeers(items.map(i => i.cid))

  const getPeers = ({ cid }: { cid: string }): number =>
    peers.find(p => p.cid === cid)?.peers ?? 0

  const completed = {
    blocks: items.map(getState).reduce((a, b) => a + b.blocks, 0),
    size: items.map(getState).reduce((a, b) => a + b.size, 0),
    count: items.map(getState).filter(i => i.status === 'COMPLETED').length
  }

  const speeds = await argv.client.getSpeeds(items.map(i => i.cid), 5000)

  const getSpeed = ({ cid }: { cid: string }): number =>
    speeds.find(s => s.cid === cid)?.speed ?? 0

  let header = 'Name'.padEnd(20)

  header += 'Size'.padEnd(27)
  header += 'Speed'.padEnd(27)
  header += 'Blocks'.padEnd(20)
  header += 'State'.padEnd(15)
  header += 'Priority'.padEnd(10)
  header += 'Revisions'.padEnd(10)
  header += 'Peers'.padEnd(10)
  header += 'Group'.padEnd(10)
  header += 'Encrypted'.padEnd(10)
  header += 'R-Strategy'.padEnd(12)
  header += 'CID'.padEnd(62)

  yield header

  const printTree = function * (tree: JStruct, depth: number = 0): Generator<string> {
    if (depth === 0) {
      yield '/'
      yield * printTree(tree, 1)
      return
    }

    for (const [key, subtree] of Object.entries(tree)) {
      try {
        const [item] = List.Return.parse([subtree])
        const timeRemaining = Math.ceil((item.size - getState(item).size) / (getSpeed(item) * 1000))

        yield [
          `${'  '.repeat(depth)}${key}`.slice(0, 18).padEnd(20),
          `${formatSize(getState(item).size)}/${formatSize(item.size)} (${formatPercent(getState(item).size / item.size)})`.slice(0, 25).padEnd(27),
          `${formatSize(getSpeed(item) * 1000)}/s ${isNaN(timeRemaining) ? '' : `(${timeRemaining} s)`}`.slice(0, 25).padEnd(27),
          `${getState(item).blocks}/${item.blocks} (${formatPercent(getState(item).blocks / item.blocks)})`.slice(0, 18).padEnd(20),
          getState(item).status.slice(0, 13).padEnd(15),
          `${item.priority}`.slice(0, 8).padEnd(10),
          `${revisionCounter[item.path] ?? 0}`.slice(0, 8).padEnd(10),
          `${getPeers(item)}`.slice(0, 8).padEnd(10),
          `${item.group}`.slice(0, 8).padEnd(10),
          `${item.encrypted}`.slice(0, 8).padEnd(10),
          `${item.revisionStrategy}`.slice(0, 8).padEnd(12),
          item.cid.padEnd(62)
        ].join('')

        continue
      } catch (error) {
        // Ignore
      }

      yield `${'  '.repeat(depth)}${key}/`
      yield * printTree(subtree as JStruct, depth + 1)
    }
  }

  yield * printTree(createJSON(items))
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
    `${formatSize(speeds.reduce((a, c) => a + c.speed, 0) * 1000)}s`.slice(0, 18).padEnd(20)
  ].join('')
})
