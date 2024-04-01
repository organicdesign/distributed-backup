import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import fs from 'fs/promises'
import Path from 'path'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { generateKeyFile } from '@organicdesign/db-key-manager'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { testPath, modulesPath } from './paths.js'

const mnemonic = 'result dune cream slogan oil sock seminar either strong girl athlete jacket'

export default async (name: string): Promise<{ start(): Promise<void>, stop(): Promise<void> }> => {
  const keyPath = Path.join(testPath, `${name}.key`)
  const socket = Path.join(testPath, `${name}.socket`)

  await generateKeyFile(keyPath, mnemonic, name)

  const args = [
    Path.join(modulesPath, '/@organicdesign/db-daemon/dist/src/index.js'),
    '-k', keyPath,
    '-c', Path.join(testPath, 'config.json'),
    '-s', socket
  ]

  let proc: ChildProcessWithoutNullStreams

  const forceQuit = async (): Promise<void> => {
    // Ensure it is really dead.
    proc.kill(9)

    await Promise.allSettled([
      fs.rm(socket),
      fs.rm(keyPath)
    ])
  }

  return {
    async start () {
      proc = spawn('node', args, { env: { ...process.env, DEBUG: 'backup:*' } })

      const promise = new DeferredPromise<void>()

      const listener = (chunk: Uint8Array): void => {
        if (uint8ArrayToString(chunk).includes('started')) {
          promise.resolve()
        }
      }

      proc.stderr.on('data', listener)

      await promise

      proc.stderr.off('data', listener)
    },

    async stop () {
      const promise = new DeferredPromise<void>()

      const listener = (chunk: Uint8Array): void => {
        if (uint8ArrayToString(chunk).includes('exiting...')) {
          promise.resolve()
        }
      }

      proc.stderr.on('data', listener)
      proc.kill('SIGINT')

      // Kill it if it fails to do it cleanly.
      setTimeout(() => {
        forceQuit().finally(() => {
          promise.reject(new Error('process did not exit cleanly'))
        })
      }, 3000)

      await promise

      proc.stderr.off('data', listener)

      // Make sure things are cleaned up.
      await forceQuit()
    }
  }
}
