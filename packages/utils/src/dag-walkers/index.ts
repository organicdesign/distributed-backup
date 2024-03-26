import { defaultDagWalkers } from './dag-walkers.js'
import type { DAGWalker } from '@helia/interface'
import type { CID } from 'multiformats/cid'

const dagWalkers = defaultDagWalkers()

export const getDagWalker = (cid: CID): DAGWalker => {
  const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code)

  if (dagWalker == null) {
    throw new Error(`No dag walker found for cid codec ${cid.code}`)
  }

  return dagWalker
}
