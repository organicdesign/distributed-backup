import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import Path from 'path'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { modulesPath, testPath } from './paths.js'

export default async (name: string, path: string, group: string): Promise<{ start(): Promise<void>, stop(): Promise<void> }> => {
  const args = [
    Path.join(modulesPath, '@organicdesign/db-fuse/dist/src/index.js'),
    '--group', group,
    '--path', path,
    '-s', Path.join(testPath, `${name}.socket`)
  ]

  let proc: ChildProcessWithoutNullStreams

  return {
    async start () {
      proc = spawn('node', args, { env: { ...process.env, DEBUG: 'backup:*' } })

      const promise = new DeferredPromise<void>()

      const listener = (chunk: Uint8Array): void => {
        if (uint8ArrayToString(chunk).includes('INIT') === true) {
          promise.resolve()
        }
      }

      proc.stderr.on('data', listener)

      await promise

      proc.stderr.off('data', listener)
    },

    async stop () {
      proc.kill('SIGINT')
    }
  }
}
