import * as cbor from '@ipld/dag-cbor'
import { keys } from '@libp2p/crypto'
import { encode as encodeBlock } from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { Identity } from 'welo'
import { importKeyFile, keyToPeerId } from './utils.js'
import type { KeyData } from './interface.js'
import type { PeerId } from '@libp2p/interface'
import type { BIP32Interface } from 'bip32'

enum keyIndicies {
  LIBP2P,
  WELO,
  AES,
  HMAC
}

/**
 * The key manager class is responsible for taking the saved output from the
 * generate keys utility and deriving the specific keys that are required.
 */
export class KeyManager {
  private readonly key: BIP32Interface
  private readonly psk: Uint8Array

  constructor (keyData: KeyData) {
    this.key = keyData.key
    this.psk = keyData.psk
  }

  getPskKey (): Uint8Array {
    return this.psk
  }

  async getPeerId (): Promise<PeerId> {
    const key = this.key.deriveHardened(keyIndicies.LIBP2P)

    return keyToPeerId(key)
  }

  async getWeloIdentity (): Promise<Identity> {
    const key = this.key.deriveHardened(keyIndicies.WELO)

    const privateBytes = key.privateKey

    if (privateBytes == null) {
      throw new Error('key is missing private data')
    }

    const publicKey = new keys.Secp256k1PublicKey(key.publicKey)
    const privateKey = new keys.Secp256k1PrivateKey(privateBytes, key.publicKey)

    const marshalled = keys.marshalPublicKey(publicKey, 'secp256k1')

    const signedIdentity = {
      id: keys.marshalPublicKey(privateKey.public, 'secp256k1'),
      pub: marshalled,
      sig: await privateKey.sign(marshalled)
    }

    const block = await encodeBlock<typeof signedIdentity, number, number>({
      value: signedIdentity,
      codec: cbor,
      hasher: sha256
    })

    return new Identity({
      pubkey: publicKey,
      priv: privateKey,
      block
    })
  }

  get aesKey (): Uint8Array {
    return this.derivePrivate(keyIndicies.AES)
  }

  get hmacKey (): Uint8Array {
    return this.derivePrivate(keyIndicies.HMAC)
  }

  private derivePrivate (index: number): Uint8Array {
    const key = this.key.deriveHardened(index)

    if (key.privateKey == null) {
      throw new Error('key is missing private data')
    }

    return key.privateKey
  }
}

export const createKeyManager = async (path: string): Promise<KeyManager> => {
  const keys = await importKeyFile(path)

  return new KeyManager(keys)
}
