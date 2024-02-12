import { createClient, type Client } from 'client'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import commands from './commands.js'
import { createMiddleware } from './utils.js'

const argv = await yargs(hideBin(process.argv))
  .command(commands)
  .demandCommand()
  .middleware(createMiddleware(argv => {
    const client = createClient(argv.socket ?? '/tmp/server.socket')

    argv.client = client

    process.on('SIGINT', () => {
      client.stop()
      process.exit(1)
    })
  }))
  .parse()

;(argv.client as Client).stop()
