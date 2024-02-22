import * as addresses from './commands/addresses.js'
import * as connect from './commands/connect.js'
import * as connections from './commands/connections.js'
import * as createGroup from './commands/create-group.js'
import * as del from './commands/delete.js'
import * as exportData from './commands/export.js'
import * as id from './commands/id.js'
import * as importData from './commands/import.js'
import * as joinGroup from './commands/join-group.js'
import * as listGroups from './commands/list-groups.js'
import * as list from './commands/list.js'
import * as read from './commands/read.js'
import * as revisions from './commands/revisions.js'
import * as setPriority from './commands/set-priority.js'
import * as sync from './commands/sync.js'
import * as write from './commands/write.js'
import type { Options } from 'yargs'

const commands = [
  addresses,
  connect,
  connections,
  createGroup,
  del,
  exportData,
  id,
  importData,
  joinGroup,
  listGroups,
  list,
  read,
  revisions,
  setPriority,
  sync,
  write
] as unknown as Array<{
  desc: string
  command: string
  builder: Record<string, Options>
  handler(argc: Record<string, unknown>): string | Promise<string>
}>

export default commands.map(c => ({
  ...c,
  handler: async (argc: Record<string, unknown>) => {
    try {
      // eslint-disable-next-line no-console
      console.log(await c.handler(argc))
    } catch (error: any) {
      if (!(error?.code === 0)) {
        throw error
      }

      // eslint-disable-next-line no-console
      console.error(`Error: ${error.message}`)
    }
  }
}))
