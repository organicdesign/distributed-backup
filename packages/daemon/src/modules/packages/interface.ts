import { z } from 'zod'
import type { CID } from 'multiformats/cid'

export const PACKAGE_KEY = '.packages'

export const EncodedEntry = z.union([
  z.object({
    cid: z.instanceof(Uint8Array)
  }),
  z.null()
])

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedEntry = z.infer<typeof EncodedEntry>

export type Entry = {
  [P in keyof NonNullable<EncodedEntry>]: NonNullable<EncodedEntry>[P] extends Uint8Array ? CID : NonNullable<EncodedEntry>[P]
}
