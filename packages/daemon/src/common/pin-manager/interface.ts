import { z } from 'zod'
import type { CID } from 'multiformats/cid'

export const EncodedPinInfo = z.object({
  priority: z.number().int().min(1).max(100).optional().default(100),
  cid: z.instanceof(Uint8Array)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedPinInfo = z.output<typeof EncodedPinInfo>

export interface PinInfo {
  priority: number
  cid: CID
}
