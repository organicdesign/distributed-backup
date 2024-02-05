import { z } from 'zod'
import type { BIP32Interface } from 'bip32'

export interface KeyData {
  key: BIP32Interface
  psk: Uint8Array
}

export const EncodedKeyData = z.object({
  key: z.string(),
  psk: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedKeyData = z.infer<typeof EncodedKeyData>
