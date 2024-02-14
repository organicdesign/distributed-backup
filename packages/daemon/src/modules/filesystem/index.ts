import { RevisionStrategies } from 'rpc-interfaces/zod'
import { z } from 'zod'
import * as del from './commands/delete.js'
import * as edit from './commands/edit.js'
import * as exportData from './commands/export.js'
import * as importData from './commands/import.js'
import * as list from './commands/list.js'
import * as read from './commands/read.js'
import * as revisions from './commands/revisions.js'
import * as write from './commands/write.js'

export const commands = [
  del,
  edit,
  exportData,
  importData,
  list,
  read,
  revisions,
  write
]

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>
