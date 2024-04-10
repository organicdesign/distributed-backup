import { z } from 'zod'
import type { Helia } from '@helia/interface'
import type { Datastore } from 'interface-datastore'
import type { CID } from 'multiformats/cid'

export interface Components {
  helia: Helia
  datastore: Datastore
}

export interface BlockInfo {
  cid: CID
  links: CID[]
}

export type EventTypes = 'pins:removed' | 'pins:added' | 'pins:adding' | 'downloads:added' | 'downloads:removed' | 'blocks:added' | 'blocks:removed'

export interface DatastorePin {
  depth: number
  metadata: Record<string, string | number | boolean>
}

export interface DatastorePinnedBlock {
  pinCount: number
  pinnedBy: Uint8Array[]
}

export interface PinState {
  size: number
  blocks: number
}

export const Block = z.object({
  size: z.number().int().min(0),
  depth: z.number().int().min(0),
  timestamp: z.number().int().min(0)
})

export interface BlockRef { cid: CID, pinnedBy: CID }

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Block = z.infer<typeof Block>

export const Download = z.object({
  depth: z.number().int().min(0)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Download = z.infer<typeof Download>

export const Pin = z.object({
  depth: z.number().int().min(0),
  status: z.enum(['COMPLETED', 'DOWNLOADING', 'DESTROYED', 'UPLOADING'])
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Pin = z.infer<typeof Pin>
