/* eslint-disable no-console */
import fs from 'fs/promises'
import readline from 'node:readline/promises'
import { resolve } from 'path'
import { multiaddr } from 'multiaddr'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'generate-config [path]'

export const desc = 'Generate config for the distributed backup node.'

export const builder = createBuilder({
  path: {
    type: 'string',
    required: true
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  const isYes = (input: string): boolean => /^(?:1|t(?:rue)?|y(?:es)?|ok(?:ay)?)$/i.test(input)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const path = resolve(argv.path)

  const rawStorage = await rl.question('Please enter the path to store program data in (Leave blank to use memory):\n')
  const storage = rawStorage.trim().length === 0 ? ':memory:' : resolve(rawStorage)

  const rawUsePsk = await rl.question('Should the network be private?\n')
  const usePsk = isYes(rawUsePsk)

  const addresses: string[] = []

  console.log('Enter the multi-addresses to bind followed by a new line (leave blank to finish):')

  for (;;) {
    const rawAddress = await rl.question('')

    if (rawAddress.trim().length === 0) {
      break
    }

    try {
      multiaddr(rawAddress)
    } catch (error) {
      console.log('Invalid address.')
      continue
    }

    addresses.push(rawAddress)
  }

  if (addresses.length === 0) {
    const addDefaultAddress = await rl.question('you have no addresses to bind to - would you like to add the default?\n')

    if (isYes(addDefaultAddress)) {
      addresses.push('/ip4/0.0.0.0/tcp/0')
    }
  }

  const bootstrap: string[] = []
  const useBootStrap = await rl.question('Would you like to specify bootstrap addresses?\n')

  if (isYes(useBootStrap)) {
    console.log('Enter the multi-addresses to bootstrap followed by a new line (leave blank to finish):')

    for (;;) {
      const rawBootstrap = await rl.question('')

      if (rawBootstrap.trim().length === 0) {
        break
      }

      try {
        multiaddr(rawBootstrap)
      } catch (error) {
        console.log('Invalid address.')
        continue
      }

      bootstrap.push(rawBootstrap)
    }
  }

  const config = JSON.stringify({
    private: usePsk,
    tickInterval: 1,
    storage,
    addresses,
    bootstrap
  }, null, 2)

  console.log('Created config:')
  console.log(config)
  const shouldWrite = await rl.question('Is this correct?\n')

  if (isYes(shouldWrite)) {
    await fs.writeFile(path, config)
    console.log(`Written config to ${path}`)
  } else {
    console.log('Aborting.')
  }

  rl.close()
})
