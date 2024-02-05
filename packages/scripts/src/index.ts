import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import commands from './commands.js'

await yargs(hideBin(process.argv))
  .command(commands)
  .demandCommand()
  .parse()
