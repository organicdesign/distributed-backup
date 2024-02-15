import fs from 'fs/promises'
import Path from 'path'
import { createNetServer } from '@organicdesign/net-rpc'
import * as logger from 'logger'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { Looper } from './looper.js'
import { projectPath } from './utils.js'
import setupBase from '@/modules/base/index.js'
import setupFilesystem from '@/modules/filesystem/index.js'
import setupGroups from '@/modules/groups/index.js'
import setupNetwork from '@/modules/network/index.js'

const argv = await yargs(hideBin(process.argv))
  .option({
    socket: {
      alias: 's',
      type: 'string',
      default: '/tmp/server.socket'
    }
  })
  .option({
    key: {
      alias: 'k',
      type: 'string',
      default: Path.join(projectPath, 'config/key.json')
    }
  })
  .option({
    config: {
      alias: 'c',
      type: 'string',
      default: Path.join(projectPath, 'config/config.json')
    }
  })
  .parse()

logger.lifecycle('starting...')

const { rpc, close } = await createNetServer(argv.socket)

const raw = await fs.readFile(argv.config, { encoding: 'utf8' })
const config = JSON.parse(raw)

// Setup all the modules

logger.lifecycle('loaded config')

const base = await setupBase({}, { config, key: argv.key })
const network = await setupNetwork({ base: base.components }, { config })
const groups = await setupGroups({ base: base.components, network: network.components }, { config })

const filesystem = await setupFilesystem({
  base: base.components,
  network: network.components,
  groups: groups.components
}, { config })

const components = [base, network, groups, filesystem]

let exiting = false

process.on('SIGINT', () => {
  if (exiting) {
    logger.lifecycle('force exiting')
    process.exit(1)
  }

  exiting = true

  ;(async () => {
    logger.lifecycle('cleaning up...')
    await close()
    logger.lifecycle('stopped server')

    logger.lifecycle('exiting...')

    process.exit()
  })().catch(error => {
    throw error
  })
})

logger.lifecycle('started')

// Setup the component commands
for (const component of components) {
  for (const command of component.commands) {
    rpc.addMethod(command.name, command.method)
  }
}

// Setup the component tick methods.
await Promise.all(
  components.map(c => c.tick)
    .filter(t => Boolean(t))
    .map(t => new Looper(async () => t?.(), { sleep: base.components.config.tickInterval }))
    .map(async l => l.run())
)
