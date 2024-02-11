import fs from 'fs/promises'
import Path from 'path'
import { promisify } from 'util'
import Fuse from '@cocalc/fuse-native'
import { createNetClient } from '@organicdesign/net-rpc'
import * as logger from 'logger'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { stat, convertOpts } from './utils.js'
import type { FuseOpts } from './interface.js'

const argv = await yargs(hideBin(process.argv))
  .option({
    socket: {
      alias: 's',
      type: 'string',
      default: '/tmp/server.socket'
    }
  })
  .option({
    group: {
      alias: 'g',
      type: 'string',
      required: true
    }
  })
  .option({
    path: {
      alias: 'p',
      type: 'string',
      required: true
    }
  })
  .parse()

const net = createNetClient(argv.socket)

const group = (() => {
  let data: any
  let ts = 0

  return {
    query: async (): Promise<Array<{ path: string, size: number, timestamp: number, mode: 'file' }>> => {
      if (Date.now() - ts > 5000) {
        ts = Date.now()
        data = (await net.rpc.request('list', { group: argv.group })).map((d: Record<string, unknown>) => ({ ...d, mode: 'file' }))
      }

      return data
    },

    reset () {
      ts = 0
    }
  }
})()

const opts: FuseOpts = {
  async readdir (path: string) {
    try {
      const list = await group.query()
      const pathParts = path.split('/').filter(p => Boolean(p))

      const filteredList = list
        .filter(l => l.path.startsWith(Path.join('/r', path, '/')))
        .map(l => ({
          ...l,
          path: l.path.slice('/r'.length)
        }))
        .map(l => ({
          ...l,
          name: l.path.split('/').filter(p => Boolean(p)).slice(pathParts.length)[0]
        }))
        .filter(l => Boolean(l.name) && l.name !== '.PLACE_HOLDER')
      // Remove duplicates
        .filter((() => {
          const f = new Set<string>()

          return (l: { name: string }) => {
            if (f.has(l.name)) {
              return false
            }

            f.add(l.name)
            return true
          }
        })())

      const names = filteredList.map(l => l.name)

      /*
      const stats = filteredList.map(l => {
        let mode: 'file' | 'dir' | null = null

        if (l.path === Path.join(path, l.name)) {
          mode = l.mode
        } else if (l.path.startsWith(path)) {
          mode = 'dir'
        } else {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw Fuse.ENOENT
        }

        return stat({
          mode,
          size: l.size,
          atime: new Date(l.timestamp),
          ctime: new Date(l.timestamp),
          mtime: new Date(l.timestamp)
        })
      })
      */

      return { names /*, stats */ }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw Fuse.ENOENT
    }
  },

  async getattr (path) {
    const list = await group.query()
    const file = list.find((l: { path: string }) => l.path === Path.join('/r', path))

    // Exact match is a file.
    if (file != null) {
      return stat({
        mode: file.mode,
        size: file.size,
        atime: new Date(file.timestamp),
        ctime: new Date(file.timestamp),
        mtime: new Date(file.timestamp)
      })
    }

    // Partial match is a directory.
    if (list.find((l: { path: string }) => l.path.startsWith(Path.join('/r', path))) != null) {
      return stat({ mode: 'dir', size: 4096 })
    }

    if (path === '/') {
      return stat({ mode: 'dir', size: 4096 })
    }

    // No match
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw Fuse.ENOENT
  },

  async open () {
    return 42 // arbitrary handle
  },

  async release () {},

  async read (path, _, buffer, length, position) {
    const str = await net.rpc.request('read', {
      group: argv.group,
      path,
      position,
      length
    })

    if (str.length !== 0) {
      buffer.write(str)
    }

    return str.length
  },

  async write (path, _, buffer, length, position) {
    await net.rpc.request('write', {
      group: argv.group,
      data: uint8ArrayToString(buffer),
      path,
      position,
      length
    })

    return length
  },

  async create (path) {
    await net.rpc.request('write', {
      group: argv.group,
      data: uint8ArrayToString(new Uint8Array([])),
      path,
      position: 0,
      length: 0
    })

    group.reset()
  },

  async unlink (path: string) {
    await net.rpc.request('delete', {
      group: argv.group,
      path
    })
  },

  async rename (src, dest) {
    const list = await group.query()
    const files = list.filter((l: { path: string }) => l.path.startsWith(Path.join('/r', src, '/')) || l.path === Path.join('/r', src)).map(f => ({ ...f, path: f.path.replace('/r', '') }))

    for (const file of files) {
      const str = await net.rpc.request('read', {
        group: argv.group,
        path: file.path,
        position: 0,
        length: 99999
      })

      await net.rpc.request('write', {
        group: argv.group,
        path: file.path.replace(src, dest),
        position: 0,
        length: str.length,
        data: uint8ArrayToString(Buffer.from(str))
      })
    }

    logger.warn('awaiting to get around database write time')
    await new Promise(resolve => setTimeout(resolve, 1000))

    await Promise.all(files.map(async file => {
      await net.rpc.request('delete', {
        group: argv.group,
        path: file.path
      })
    }))

    group.reset()
  },

  async mkdir (path) {
    await net.rpc.request('write', {
      group: argv.group,
      data: uint8ArrayToString(new Uint8Array([])),
      path: Path.join(path, '.PLACE_HOLDER'),
      position: 0,
      length: 0
    })

    group.reset()
  },

  async rmdir (path) {
    const list = await group.query()
    const files = list.filter((l: { path: string }) => l.path.startsWith(Path.join('/r', path, '/')))

    for (const file of files) {
      await net.rpc.request('delete', {
        group: argv.group,
        path: file.path.replace('/r', '')
      })
    }

    group.reset()
  }
}

await fs.mkdir(argv.path, { recursive: true })

const fuse = new Fuse(argv.path, convertOpts(opts), { debug: true })

process.on('uncaughtException', (error) => {
  logger.error(error)

  promisify(fuse.unmount.bind(fuse))().then(() => {
    process.exit(1)
  }).catch(error => {
    logger.error(error)
    process.exit(1)
  })
})

process.on('SIGINT', () => {
  promisify(fuse.unmount.bind(fuse))().then(() => {
    process.exit(1)
  }).catch(error => {
    logger.error(error)
    process.exit(1)
  })
})

await promisify(fuse.mount.bind(fuse))()
