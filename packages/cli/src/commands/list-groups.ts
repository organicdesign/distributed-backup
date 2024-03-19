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

  const peers = await argv.client.countPeers(groups.map(g => g.group))
  const getPeerCount = (cid: string): number => peers.find(p => p.cid === cid)?.peers ?? 0

  const items = await Promise.all(groups.map(async ({ group }) => ({
    group,
    items: await argv.client?.list({ group })
  })))

  const getItemCount = (group: string): number => items.find(i => i.group === group)?.items?.length ?? 0

  let out = `${'Name'.padEnd(34)}${'Items'.padEnd(10)}${'Peers'.padEnd(10)}${'CID'.padEnd(62)}\n`

  out += groups.map(({ group, name }) => {
    let str = ''

    str += name.slice(0, 32).padEnd(34)
    str += `${getItemCount(group)}`.slice(0, 8).padEnd(10)
    str += `${getPeerCount(group)}`.padEnd(10)
    str += group.padEnd(62)

    return str
  }).join('\n')

  return out
})
