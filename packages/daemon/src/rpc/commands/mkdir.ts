import Path from 'path'
import { CID } from 'multiformats/cid'
import { z } from 'zod'
import { type Components, zCID, ImportOptions } from '../../interface.js'

export const name = 'mkdir'

const Params = ImportOptions.partial().extend(z.object({
  path: z.string(),
  group: zCID
}).shape)

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)
  const group = CID.parse(params.group)
  const database = components.groups.get(group)

  if (database == null) {
    throw new Error('no such group')
  }

  const op = database.store.creators.put(Path.join('/d', params.path), {
    timestamp: Date.now()
  })

  await database.replica.write(op)
}
