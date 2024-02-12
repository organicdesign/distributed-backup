import * as addresses from './rpc/addresses.js'
import * as connect from './rpc/connect.js'
import * as connections from './rpc/connections.js'
import * as createGroup from './rpc/create-group.js'
import * as del from './rpc/delete.js'
import * as edit from './rpc/edit.js'
import * as exportData from './rpc/export.js'
import * as id from './rpc/id.js'
import * as importData from './rpc/import.js'
import * as joinGroup from './rpc/join-group.js'
import * as listGroups from './rpc/list-groups.js'
import * as list from './rpc/list.js'
import * as read from './rpc/read.js'
import * as revisions from './rpc/revisions.js'
import * as sync from './rpc/sync.js'
import * as write from './rpc/write.js'
import type { Components } from './interface.js'

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
