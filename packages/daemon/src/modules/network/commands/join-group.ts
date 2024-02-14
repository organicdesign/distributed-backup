import { JoinGroup } from 'rpc-interfaces'
import { Address } from 'welo'
import type { Components } from '@/interface.js'

export const name = 'join-group'

export const method = (components: Components) => async (raw: unknown): Promise<JoinGroup.Return> => {
  const params = JoinGroup.Params.parse(raw)
  const manifest = await components.welo.fetch(Address.fromString(`/hldb/${params.group}`))

  try {
    await components.groups.add(manifest)
  } catch (error) {
    if ((error as Error).message.includes('is already open')) {
      throw new Error('group has already been joined')
    }

    throw error
  }

  return null
}
