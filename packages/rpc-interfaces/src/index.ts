import { CID } from 'multiformats/cid'
import { z } from 'zod'

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

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type RevisionStrategies = z.infer<typeof RevisionStrategies>

export const AddParams = z.object({
  group: zCID,
  path: z.string(),
  localPath: z.string(),
  hash: z.string().optional(),
  cidVersion: z.union([z.literal(0), z.literal(1)]).optional(),
  chunker: z.string().optional(),
  rawLeaves: z.boolean().optional(),
  encrypt: z.boolean().optional(),
  onlyHash: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
  versionCount: z.number().optional(),
  priority: z.number().optional(),
  revisionStrategy: RevisionStrategies.optional()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AddParams = z.infer<typeof AddParams>

export const AddReturn = z.array(z.object({
  cid: zCID,
  path: z.string(),
  virtualPath: z.string()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AddReturn = z.infer<typeof AddReturn>
