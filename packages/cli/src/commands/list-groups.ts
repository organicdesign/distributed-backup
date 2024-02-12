import { createBuilder, createHandler } from '../utils.js'

export const command = 'list-groups'

export const desc = 'List joined groups.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const groups = await argv.client.listGroups()

  if (argv.json === true) {
    return JSON.stringify(groups)
  }

  let out = `${'Name'.padEnd(34)}${'Items'.padEnd(10)}${'Peers'.padEnd(10)}${'CID'.padEnd(62)}\n`

  for (const group of groups) {
    let str = ''

    str += group.name.slice(0, 32).padEnd(34)
    str += 'Not Implemented'.slice(0, 8).padEnd(10)
    str += 'Not Implemented'.slice(0, 8).padEnd(10)
    str += group.group.padEnd(62)

    out += `${str}\n`
  }

  return out
})
