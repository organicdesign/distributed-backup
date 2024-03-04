import { createBuilder, createHandler } from '../utils.js'

export const command = 'list-packages [group]'

export const desc = 'List packages in the group.'

export const builder = createBuilder({
  group: {
    type: 'string',
    required: true
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const packages = await argv.client.listPackages(argv.group)

  if (argv.json === true) {
    return JSON.stringify(packages)
  }

  return packages.map(p => `${p.name}: ${p.cid}`).join('\n')
})
