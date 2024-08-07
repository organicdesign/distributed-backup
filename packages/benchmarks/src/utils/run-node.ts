import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import fs from 'fs/promises'
import Path from 'path'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { modulesPath } from './paths.js'

export default async (path: string, options: { persistent?: boolean } = {}): Promise<{ start(): Promise<void>, stop(): Promise<void>, socket: string }> => {
  const socket = Path.join(path, 'socket')
  const config = Path.join(path, 'config.json')
  const storagePath = Path.join(path, 'storage')

  await fs.mkdir(path, { recursive: true })

  await fs.writeFile(config, JSON.stringify({
    storage: options.persistent === true ? storagePath : ':memory:'
  }))

  const args = [
    Path.join(modulesPath, '@organicdesign/db-daemon/dist/src/index.js'),
    '-s', socket,
    '-c', config
  ]

  let proc: ChildProcessWithoutNullStreams

  const forceQuit = async (): Promise<void> => {
    // Ensure it is really dead.
    proc.kill(9)

    await Promise.allSettled([
      fs.rm(socket)
    ])
  }

  return {
    socket,

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
        }).catch(() => {
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
