import * as addresses from './commands/addresses.js'
import * as connect from './commands/connect.js'
import * as connections from './commands/connections.js'
import * as createGroup from './commands/create-group.js'
import * as id from './commands/id.js'
import * as joinGroup from './commands/join-group.js'
import * as listGroups from './commands/list-groups.js'
import * as sync from './commands/sync.js'

export const commands = [
	addresses,
	connect,
	connections,
	createGroup,
	id,
	joinGroup,
	listGroups,
	sync
]
