import { createNetClient, type NetClient } from '@organicdesign/net-rpc'
import { createClient, type Client } from 'client'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import commands from './commands.js'
import { createMiddleware } from './utils.js'

const argv = await yargs(hideBin(process.argv))
  .command(commands)
  .demandCommand()
  .middleware(createMiddleware(argv => {
    const client = createNetClient(argv.socket ?? '/tmp/server.socket')
    const client2 = createClient(argv.socket ?? '/tmp/server.socket')

    argv.client = client
    argv.client2 = client2

    process.on('SIGINT', () => {
      client.close()
      client2.stop()
      process.exit(1)
    })
  }))
  .parse()

;(argv.client as NetClient).close()
;(argv.client2 as Client).stop()
