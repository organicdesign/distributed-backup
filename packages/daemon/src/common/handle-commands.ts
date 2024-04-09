import addresses from './commands/addresses.js'
import connect from './commands/connect.js'
import connections from './commands/connections.js'
import countPeers from './commands/count-peers.js'
import createGroup from './commands/create-group.js'
import getSpeeds from './commands/get-speeds.js'
import getState from './commands/get-state.js'
import id from './commands/id.js'
import joinGroup from './commands/join-group.js'
import listGroups from './commands/list-groups.js'
import setPriority from './commands/set-priority.js'
import sneakernetReveive from './commands/sneakernet-receive.js'
import sneakernetSend from './commands/sneakernet-send.js'
import sync from './commands/sync.js'
import type { Components } from './interface.js'

export default (components: Components): void => {
  const commands = [
    addresses,
    connect,
    connections,
    countPeers,
    createGroup,
    getSpeeds,
    getState,
    id,
    joinGroup,
    listGroups,
    setPriority,
    sneakernetReveive,
    sneakernetSend,
    sync
  ]

  for (const command of commands) {
    command(components, {})
  }
}
