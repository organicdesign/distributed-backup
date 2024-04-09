import { sha256 as defaultSha256 } from 'multiformats/hashes/sha2'
import { Digest } from 'multiformats/hashes/digest'

export const sha256 = async (input: Uint8Array): Promise<Digest<typeof defaultSha256.code, number>> => await defaultSha256.digest(input)
