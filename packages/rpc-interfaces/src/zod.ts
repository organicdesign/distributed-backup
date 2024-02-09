import { multiaddr } from '@multiformats/multiaddr'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString, type SupportedEncodings } from 'uint8arrays/from-string'
import { z } from 'zod'

export const zCID = (): z.ZodType<string> => z.custom<string>(val => {
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

export const zMultiaddr = (): z.ZodType<string> => z.custom<string>(val => {
  if (typeof val !== 'string') {
    return false
  }

  try {
    multiaddr(val)
  } catch (error) {
    return false
  }

  return true
})

export const zEncoding = (encoding?: SupportedEncodings): z.ZodType<string> => z.custom<string>(val => {
  if (typeof val !== 'string') {
    return false
  }

  try {
    uint8ArrayFromString(val, encoding)
  } catch (error) {
    return false
  }

  return true
})

export const RevisionStrategies = z.enum(['all', 'none', 'log'])

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type RevisionStrategies = z.infer<typeof RevisionStrategies>
