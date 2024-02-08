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

export const ImportName = 'import'

export const ImportParams = z.object({
  group: zCID(),
  localPath: z.string(),
  path: z.string().optional().default('/'),
  hash: z.string().optional().default('sha2-256'),
  cidVersion: z.union([z.literal(0), z.literal(1)]).optional().default(1),
  chunker: z.string().optional().default('size-262144'),
  rawLeaves: z.boolean().optional().default(true),
  encrypt: z.boolean().optional().default(false),
  onlyHash: z.boolean().optional().default(false),
  priority: z.number().optional().default(1),
  revisionStrategy: RevisionStrategies.optional().default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ImportParams = z.input<typeof ImportParams>

export const ImportReturn = z.array(z.object({
  cid: zCID(),
  path: z.string(),
  virtualPath: z.string()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ImportReturn = z.infer<typeof ImportReturn>

export const AddressesName = 'addresses'

export const AddressesParams = z.object({})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AddressesParams = z.infer<typeof AddressesParams>

export const AddressesReturn = z.array(zMultiaddr())

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AddressesReturn = z.infer<typeof AddressesReturn>

export const ConnectName = 'connect'

export const ConnectParams = z.object({
  address: zMultiaddr()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ConnectParams = z.infer<typeof ConnectParams>

export const ConnectReturn = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ConnectReturn = z.infer<typeof ConnectReturn>

export const ConnectionsName = 'connections'

export const ConnectionsParams = z.object({})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ConnectionsParams = z.infer<typeof ConnectionsParams>

export const ConnectionsReturn = z.array(zMultiaddr())

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ConnectionsReturn = z.infer<typeof ConnectionsReturn>

export const CreateGroupName = 'create-group'

export const CreateGroupParams = z.object({
  name: z.string(),
  peers: z.array(zEncoding('base58btc'))
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CreateGroupParams = z.infer<typeof CreateGroupParams>

export const CreateGroupReturn = zCID()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CreateGroupReturn = z.infer<typeof CreateGroupReturn>

export const DeleteName = 'delete'

export const DeleteParams = z.object({
  path: z.string(),
  group: zCID()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DeleteParams = z.infer<typeof DeleteParams>

export const DeleteReturn = z.array(z.object({
  path: z.string(),
  cid: zCID()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DeleteReturn = z.infer<typeof DeleteReturn>

export const EditName = 'edit'

export const EditParams = z.object({
  path: z.string(),
  group: zCID(),
  priority: z.number().optional(),
  revisionStrategy: RevisionStrategies.optional()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EditParams = z.infer<typeof EditParams>

export const EditReturn = z.array(z.string())

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EditReturn = z.infer<typeof EditReturn>

export const ExportName = 'export'

export const ExportParams = z.object({
  path: z.string(),
  outPath: z.string(),
  group: zCID()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ExportParams = z.infer<typeof ExportParams>

export const ExportReturn = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ExportReturn = z.infer<typeof ExportReturn>

export const IDName = 'id'

export const IDParams = z.object({})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type IDParams = z.infer<typeof IDParams>

export const IDReturn = zEncoding('base58btc')

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type IDReturn = z.infer<typeof IDReturn>

export const JoinGroupName = 'join-group'

export const JoinGroupParams = z.object({
  group: zCID()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type JoinGroupParams = z.infer<typeof JoinGroupParams>

export const JoinGroupReturn = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type JoinGroupReturn = z.infer<typeof JoinGroupReturn>

export const ListGroupsName = 'list-groups'

export const ListGroupsParams = z.object({})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ListGroupsParams = z.infer<typeof ListGroupsParams>

export const ListGroupsReturn = z.array(z.object({
  group: zCID(),
  name: z.string()
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ListGroupsReturn = z.infer<typeof ListGroupsReturn>

export const ListName = 'list'

export const ListParams = z.object({
  group: zCID().optional(),
  path: z.string().optional().default('/')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ListParams = z.input<typeof ListParams>

export const ListReturn = z.array(z.object({
  path: z.string(),
  cid: zCID(),
  name: z.string(),
  group: zCID(),
  priority: z.number(),
  blocks: z.number().int().min(0),
  size: z.number().int().min(0),
  timestamp: z.number().int().min(0),
  encrypted: z.boolean(),
  author: zEncoding('base58btc'),
  revisionStrategy: RevisionStrategies
}))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ListReturn = z.infer<typeof ListReturn>

export const ReadName = 'read'

export const ReadParams = z.object({
  group: zCID(),
  path: z.string(),
  position: z.number().int().min(0).optional().default(0),
  length: z.number().int().min(0).optional().default(1024 ** 2)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ReadParams = z.input<typeof ReadParams>

export const ReadReturn = z.string()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ReadReturn = z.infer<typeof ReadReturn>

export const SyncName = 'sync'

export const SyncParams = z.object({})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type SyncParams = z.infer<typeof SyncParams>

export const SyncReturn = z.null()

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type SyncReturn = z.infer<typeof SyncReturn>

export const WriteName = 'write'

export const WriteParams = z.object({
  group: zCID(),
  path: z.string(),
  position: z.number().int().min(0).optional().default(0),
  length: z.number().int().min(0).optional().default(1024 ** 2),
  data: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type WriteParams = z.input<typeof WriteParams>

export const WriteReturn = z.number().int().min(0)

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type WriteReturn = z.infer<typeof WriteReturn>
