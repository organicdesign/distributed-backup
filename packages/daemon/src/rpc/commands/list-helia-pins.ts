import all from 'it-all'
import type { Components } from '../../interface.js'

export const name = 'list-helia-pins'

export const method = ({ helia }: Components) => async () => {
  const pins = await all(helia.pins.ls())

  return pins.map(p => p.cid.toString())
}
