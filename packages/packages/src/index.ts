import fs from 'fs/promises'
import { createClient } from '@organicdesign/db-client'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

const argv = await yargs(hideBin(process.argv))
  .option({
    socket: {
      alias: 's',
      type: 'string',
      default: '/tmp/server.socket'
    }
  })
  .option({
    tempDir: {
      type: 'string',
      default: '/tmp/package-installer'
    }
  })
  .option({
    group: {
      alias: 'g',
      type: 'string',
      required: true
    }
  })
  .parse()

const client = createClient(argv.socket)

const id = await client.id()

await fs.mkdir(argv.tempDir, { recursive: true })

interface PackageContext {
  state: 'created' | 'completed'
  target: string
  parameters: Record<string, unknown>
  package: string
}

setInterval(() => {
  void (async () => {
    const events = await client.getSchedule(argv.group)

    const eventsNow = events
      .map(e => e as (Omit<typeof e, 'context'> & { context: PackageContext }))
      .filter(e => e.from > Date.now() && e.to < Date.now())
      .filter(e => e.type === 'package')
      .filter(e => e.context.target === id)
      .filter(e => e.context.state === 'created')

    for (const event of eventsNow) {
    // eslint-disable-next-line no-console
      console.log('parsing event', event.id)

      await client.exportPackage(argv.group, '/tmp/package-installer', event.context.package)

      event.context.state = 'completed'

      await client.updateSchedule(argv.group, event.id, event.context)
    }
  })().catch(error => {
  // eslint-disable-next-line no-console
    console.error(error)
  })
}, 10000)
