import * as logger from 'logger'
import type { FuseOpts } from './interface.js'
import type Fuse from '@cocalc/fuse-native'

export const stat = (st: {
  mtime?: Date
  atime?: Date
  ctime?: Date
  size?: number
  mode: string
  uid?: number
  gid?: number
}): Fuse.Stats => {
  let mode = 0

  switch (st.mode) {
    case 'dir':
      mode = 16877
      break
    case 'file':
      mode = 33188
      break
    case 'link':
      mode = 33188
      break
    default:
      mode = 0
  }

  return {
    mtime: st.mtime ?? new Date(),
    atime: st.atime ?? new Date(),
    ctime: st.ctime ?? new Date(),
    size: st.size ?? 0,
    uid: st.uid ?? process.getuid?.() ?? 0,
    gid: st.gid ?? process.getgid?.() ?? 0,
    nlink: 0,
    dev: 0,
    blksize: 0,
    blocks: 0,
    ino: 0,
    rdev: 0,
    mode
  }
}

export const convertOpts = (opts: FuseOpts): Fuse.OPERATIONS => {
  const out: Partial<Fuse.OPERATIONS> = {}

  for (const key of Object.keys(opts)) {
    (out as Record<string, unknown>)[key] = function () {
      const args = [...arguments]
      const cb = args.pop();

      (opts as Record<string, (...params: any[]) => any>)[key].apply(null, args).then(function (r: unknown) {
        if (key === 'read') {
          cb(r)
          return
        }

        if (key === 'write') {
          cb(r)
          return
        }

        if (key === 'readdir') {
          // eslint-disable-next-line n/no-callback-literal
          cb(0, (r as any).names, (r as any).stats)
        }

        // eslint-disable-next-line n/no-callback-literal
        cb(0, r)
      }).catch((error: number | Error) => {
        if (typeof error === 'number') {
          cb(error)
        } else {
          logger.error(error)
          // eslint-disable-next-line n/no-callback-literal
          cb(1)
        }
      })
    }
  }

  return out as Fuse.OPERATIONS
}
