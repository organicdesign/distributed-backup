/* eslint-disable no-console */
import { resolve } from 'path'
import { generateMnemonic, generateKeyFile } from '@organicdesign/db-key-manager'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'generate-keys [path]'

export const desc = 'Generate keys for the distributed backup group.'

export const builder = createBuilder({
  path: {
    type: 'string',
    required: true
  },

  mnemonic: {
    alias: 'm',
    type: 'string'
  },

  name: {
    alias: 'n',
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  const mnemonic = argv.mnemonic ?? generateMnemonic()
  const name = argv.name ?? generateMnemonic().split(' ')[0]

  if (argv.mnemonic == null) {
    console.log(`Mnemonic:\n  ${mnemonic}`)
  }

  if (argv.name == null) {
    console.log(`Name:\n  ${name}`)
  }

  if (argv.path != null) {
    await generateKeyFile(resolve(argv.path), mnemonic, name)
  }
})
