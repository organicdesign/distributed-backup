import fs from 'fs/promises'
import Path from 'path'
import { promisify } from 'util'
import Fuse from '@cocalc/fuse-native'
import { createClient } from '@organicdesign/db-client'
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
  .option({
    at: {
      alias: 't',
      type: 'number',
      default: 0
    }
  })
  .parse()

const client = createClient(argv.socket)

type RT = Pick<Awaited<ReturnType<typeof client.list>>[number], 'path' | 'timestamp' | 'size'>

const group = (() => {
  let data: RT[]
  let ts = 0

  return {
    query: async (): Promise<RT[]> => {
      if (Date.now() - ts > 5000) {
        ts = Date.now()
        data = await client.list({ group: argv.group })

        if (argv.at > 0) {
          const rs = await Promise.all(data.map(async d => {
            if (d.timestamp < argv.at) {
              return d
            }

            const revisions = await client.listRevisions(argv.group, d.path)

            for (const revision of revisions) {
              if (revision.timestamp < argv.at) {
                return { ...revision, path: d.path }
              }
            }

            return null
          }))

          data = rs.filter(d => d != null) as RT[]
        }
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

      const stats = filteredList.map(l => {
        let mode: 'file' | 'dir' | null = null

        if (l.path === Path.join(path, l.name)) {
          mode = 'file'
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

      return { names, stats }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw Fuse.ENOENT
    }
  },

  async getattr (path) {
    const list = await group.query()
    const file = list.find((l: { path: string }) => l.path === path)

    // Exact match is a file.
    if (file != null) {
      return stat({
        mode: 'file',
        size: file.size,
        atime: new Date(file.timestamp),
        ctime: new Date(file.timestamp),
        mtime: new Date(file.timestamp)
      })
    }

    // Partial match is a directory.
    if (list.find((l: { path: string }) => l.path.startsWith(path)) != null) {
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
    const str = await client.read(
      argv.group,
      path,
      { position, length }
    )

    if (str.length !== 0) {
      buffer.write(str)
    }

    return str.length
  },

  async write (path, _, buffer, length, position) {
    const written = await client.write(argv.group, path, uint8ArrayToString(buffer), {
      position,
      length
    })

    return written
  },

  async create (path) {
    await client.write(argv.group, path, uint8ArrayToString(new Uint8Array([])), {
      length: 0
    })

    group.reset()
  },

  async unlink (path: string) {
    await client.delete(argv.group, path)
  },

  async rename (src, dest) {
    const list = await group.query()
    const files = list.filter((l: { path: string }) => l.path.startsWith(Path.join(src, '/')) || l.path === src)

    for (const file of files) {
      const str = await client.read(argv.group, file.path, {
        length: 99999
      })

      await client.write(
        argv.group, file.path.replace(src, dest), uint8ArrayToString(Buffer.from(str)), {
          length: str.length
        })
    }

    // eslint-disable-next-line no-console
    console.warn('awaiting to get around database write time')
    await new Promise(resolve => setTimeout(resolve, 1000))

    await Promise.all(files.map(async file => {
      await client.delete(argv.group, file.path)
    }))

    group.reset()
  },

  async mkdir (path) {
    await client.write(
      argv.group,
      Path.join(path, '.PLACE_HOLDER'),
      uint8ArrayToString(new Uint8Array([])), {
        length: 0
      })

    group.reset()
  },

  async rmdir (path) {
    const list = await group.query()
    const files = list.filter((l: { path: string }) => l.path.startsWith(Path.join(path, '/')))

    for (const file of files) {
      await client.delete(argv.group, file.path)
    }

    group.reset()
  },

  async getxattr () {
    return null
  },

  async listxattr () {
    return []
  }
}

await fs.mkdir(argv.path, { recursive: true })

const fuse = new Fuse(argv.path, convertOpts(opts), { debug: true })

process.on('uncaughtException', (error) => {
  // eslint-disable-next-line no-console
  console.error(error)

  promisify(fuse.unmount.bind(fuse))().then(() => {
    process.exit(1)
  }).catch(error => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
})

process.on('SIGINT', () => {
  promisify(fuse.unmount.bind(fuse))().then(() => {
    process.exit(1)
  }).catch(error => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
})

await promisify(fuse.mount.bind(fuse))()
