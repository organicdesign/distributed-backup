import { CID } from 'multiformats/cid'
import { z } from 'zod'
import { zCID, type Components } from '../../interface.js'

export const name = 'delete'

const Params = z.object({
  path: z.string(),
  group: zCID
})

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)

  await components.uploads.add('delete', [CID.parse(params.group).bytes, params.path])
}
