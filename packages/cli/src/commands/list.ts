import { List } from 'rpc-interfaces'
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
  return `${Math.floor(decimal * 1000) / 10}%`
}

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const items = await argv.client.list()
  const revisionCounter: Record<string, number> = {}

  items.sort((a, b) => a.path.localeCompare(b.path))

  const total = {
    blocks: items.reduce((a, b) => a + b.blocks, 0), // items.reduce((a, b) => a + b.totalBlocks, 0),
    size: items.reduce((a, b) => a + b.size, 0), // items.reduce((a, b) => a + b.totalSize, 0),
    count: items.length
  }

  if (argv.json === true) {
    return JSON.stringify({
      items,
      total
    })
  }

  const statuses = await argv.client.getStatus(items.map(i => i.cid))

  const getStatus = ({ cid }: { cid: string }): (typeof statuses)[number] =>
    statuses.find(s => s.cid === cid) ?? { state: 'NOTFOUND', blocks: 0, size: 0, cid }

  const completed = {
    blocks: items.map(getStatus).reduce((a, b) => a + b.blocks, 0),
    size: items.map(getStatus).reduce((a, b) => a + b.size, 0),
    count: items.map(getStatus).filter(i => i.state === 'COMPLETED').length
  }

  let header = 'Name'.padEnd(20)

  header += 'Size'.padEnd(27)
  header += 'Blocks'.padEnd(20)
  header += 'State'.padEnd(15)
  header += 'Priority'.padEnd(10)
  header += 'Revisions'.padEnd(10)
  header += 'Peers'.padEnd(10)
  header += 'Group'.padEnd(10)
  header += 'Encrypted'.padEnd(10)
  header += 'R-Strategy'.padEnd(12)
  header += 'CID'.padEnd(62)

  let response = `${header}\n`

  const printTree = (tree: JStruct, depth: number = 0): void => {
    if (depth === 0) {
      response += '/\n'
      printTree(tree, 1)
      return
    }

    for (const [key, subtree] of Object.entries(tree)) {
      try {
        const [item] = List.Return.parse([subtree])
        let str = ''

        str += `${'  '.repeat(depth)}${key}`.slice(0, 18).padEnd(20)
        str += `${formatSize(getStatus(item).size)}/${formatSize(item.size)} (${formatPercent(getStatus(item).size / item.size)})`.slice(0, 25).padEnd(27)
        str += `${getStatus(item).blocks}/${item.blocks} (${formatPercent(getStatus(item).blocks / item.blocks)})`.slice(0, 18).padEnd(20)
        str += getStatus(item).state.slice(0, 13).padEnd(15)
        str += `${item.priority}`.slice(0, 8).padEnd(10)
        str += `${revisionCounter[item.path] ?? 0}`.slice(0, 8).padEnd(10)
        str += 'Not Implemented'.slice(0, 8).padEnd(10)
        str += `${item.group}`.slice(0, 8).padEnd(10)
        str += `${item.encrypted}`.slice(0, 8).padEnd(10)
        str += `${item.revisionStrategy}`.slice(0, 8).padEnd(12)
        str += item.cid.padEnd(62)

        response += `${str}\n`
        continue
      } catch (error) {
        // Ignore
      }

      response += `${'  '.repeat(depth)}${key}/\n`

      printTree(subtree as JStruct, depth + 1)
    }
  }

  printTree(createJSON(items))

  let footer = '\n'

  footer += 'Total'.padEnd(15)
  footer += 'Size'.padEnd(25)
  footer += 'Blocks'.padEnd(20)
  footer += '\n'
  footer += `${completed.count}/${total.count} (${formatPercent(0 / total.count)})`.slice(0, 13).padEnd(15)
  footer += `${formatSize(completed.size)}/${formatSize(total.size)} (${formatPercent(completed.size / total.size)})`.slice(0, 23).padEnd(25)
  footer += `${completed.blocks}/${total.blocks} (${formatPercent(completed.blocks / total.blocks)})`.slice(0, 18).padEnd(20)

  response += `${footer}\n`

  return response
})
