import { z } from 'zod'

export const PeerData = z.object({
  // This is a list of blocks that this peer wants.
  wants: z.array(z.instanceof(Uint8Array)),

  // This is a list of the heads this peer is known to have.
  heads: z.array(z.instanceof(Uint8Array))
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type PeerData = z.infer<typeof PeerData>

export const EncodedPeerData = z.array(z.object({
  id: z.instanceof(Uint8Array)
}).extend(PeerData.shape))

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedPeerData = z.infer<typeof EncodedPeerData>
