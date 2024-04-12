import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'list-groups'

export const desc = 'List joined groups.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const groups = await argv.client.listGroups()

  if (argv.json === true) {
    yield JSON.stringify(groups)
    return
  }

  const getGroupData = async (group: string): Promise<{
    peers: number
    items: number
  }> => {
    if (argv.client == null) {
      throw new Error('Failed to connect to daemon.')
    }

    const [items, peers] = await Promise.all([
      await argv.client?.list({ group }),
      argv.client.countPeers(group)
    ])

    return { items: items.length, peers }
  }

  const getDataFuncs = groups.map(group => async () => ({
    group,
    data: await getGroupData(group.group)
  }))

  yield `${'Name'.padEnd(34)}${'Items'.padEnd(10)}${'Peers'.padEnd(10)}${'CID'.padEnd(62)}`

  yield ''

  yield * pipe(
    getDataFuncs,
    i => parallel(i, { ordered: false, concurrency: 3 }),
    async function * (items) {
      for await (const { group, data } of items) {
        yield [
          group.name.slice(0, 32).padEnd(34),
          `${data.items}`.slice(0, 8).padEnd(10),
          `${data.peers}`.padEnd(10),
          group.group.padEnd(62)
        ].join('')
      }
    }
  )
})
