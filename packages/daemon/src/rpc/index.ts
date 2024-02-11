import * as addresses from './commands/addresses.js'
import * as connect from './commands/connect.js'
import * as connections from './commands/connections.js'
import * as createGroup from './commands/create-group.js'
import * as del from './commands/delete.js'
import * as edit from './commands/edit.js'
import * as exportData from './commands/export.js'
import * as id from './commands/id.js'
import * as importData from './commands/import.js'
import * as joinGroup from './commands/join-group.js'
import * as listGroups from './commands/list-groups.js'
import * as list from './commands/list.js'
import * as read from './commands/read.js'
import * as revisions from './commands/revisions.js'
import * as sync from './commands/sync.js'
import * as write from './commands/write.js'
import type { Components } from '../interface.js'

export default [
  addresses,
  connect,
  connections,
  createGroup,
  del,
  edit,
  exportData,
  id,
  importData,
  joinGroup,
  listGroups,
  list,
  read,
  revisions,
  sync,
  write
] as Array<{
  name: string
  method(components: Components): (params: Record<string, unknown>) => Promise<unknown> | unknown
}>
