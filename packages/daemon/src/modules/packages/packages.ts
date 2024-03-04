import Path from 'path'
import { PACKAGE_KEY } from './interface.js'
import type { Pair } from '@/interface.js'
import type { FileSystem } from '@/modules/filesystem/file-system.js'
import type { Entry } from '@/modules/filesystem/interface.js'
import type { CID } from 'multiformats/cid'

export class Packages {
  private readonly fs: FileSystem

  constructor (fs: FileSystem) {
    this.fs = fs
  }

  async get (name: string): Promise<Entry | null> {
    return this.fs.get(this.toPath(name))
  }

  async put (name: string, cid: CID): Promise<void> {
    await this.fs.put(this.toPath(name), {
      cid,
      priority: 1,
      revisionStrategy: 'all',
      encrypted: false
    })
  }

  async * all (): AsyncGenerator<Pair<string, Entry>> {
    const path = Path.join('/', PACKAGE_KEY)

    for await (const pair of this.fs.getDir(path)) {
      yield { key: this.fromPath(pair.key), value: pair.value }
    }
  }

  private toPath (name: string): string {
    return Path.join('/', PACKAGE_KEY, `${name}.tar`)
  }

  private fromPath (path: string): string {
    return path.replace(Path.join('/', PACKAGE_KEY), '').replace('.tar', '').replaceAll('/', '')
  }
}
