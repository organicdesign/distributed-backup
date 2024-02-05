import crypto from 'crypto'
import type { Components, EncryptionParams } from './interface.js'

/**
 * This class handles deterministic aes encryption of data.
 */
export class Cipher {
  private readonly aesKey: Uint8Array
  private readonly hmacKey: Uint8Array

  constructor (components: Components) {
    this.aesKey = components.aesKey
    this.hmacKey = components.hmacKey
  }

  /**
   * Generate the encryption params (iv and salt).
   */
  async generate (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<EncryptionParams> {
    const hmac = await this.generateHmac(data)
    const iv = hmac.subarray(0, 16)
    const salt = hmac.subarray(16, 32)

    return { iv, salt }
  }

  /**
   * Encrypt data optionally using encryption parameters.
   */
  async * encrypt (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>, params?: EncryptionParams): AsyncGenerator<Buffer> {
    if (params == null) {
      params = await this.generate(data)
    }

    const key = await this.deriveKey(params.salt)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, params.iv, { encoding: 'binary' })

    for await (const chunk of data) {
      yield cipher.update(chunk)
    }

    const last = cipher.final()

    if (last.length !== 0) {
      yield last
    }
  }

  private async deriveKey (salt: Uint8Array): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      crypto.hkdf(
        'sha256',
        this.aesKey,
        salt,
        new Uint8Array(),
        32,
        (err, derivedKey) => {
          if (err != null) {
            reject(err)
            return
          }

          resolve(new Uint8Array(derivedKey))
        }
      )
    })
  }

  private async generateHmac (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<Buffer> {
    const max: number | null = null
    const hmac = crypto.createHmac('sha256', this.hmacKey)
    let len = 0

    for await (const chunk of data) {
      if (max != null && len + chunk.length > max) {
        const diff = len + chunk.length - max

        hmac.update(chunk.slice(0, diff))
        break
      }

      hmac.update(chunk)

      len += chunk.length

      if (max != null && len >= max) {
        break
      }
    }

    return hmac.digest()
  }
}
