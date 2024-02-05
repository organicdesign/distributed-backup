import { Address } from 'welo'
import { z } from 'zod'
import { type Components, zCID } from '../../interface.js'

export const name = 'join-group'

const Params = z.object({
  group: zCID
})

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)
  const manifest = await components.welo.fetch(Address.fromString(`/hldb/${params.group}`))

  try {
    await components.groups.add(manifest)
  } catch (error) {
    if ((error as Error).message.includes('is already open')) {
      throw new Error('group has already been joined')
    }

    throw error
  }

  return manifest.address.cid.toString()
}
