import { CID } from 'multiformats/cid'
import z from 'zod'

export const zCID = z.custom<string>(val => {
  if (typeof val !== 'string') {
    return false
  }

  try {
    CID.parse(val)
  } catch (error) {
    return false
  }

  return true
})

export const RevisionStrategies = z.enum(['all', 'none', 'log'])
