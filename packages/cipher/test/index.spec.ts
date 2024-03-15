import assert from 'assert/strict'
import { KeyManager, parseKeyData } from '@organicdesign/db-key-manager'
import all from 'it-all'
import { concat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Cipher } from '../src/index.js'
import data from './data.js'

describe('cipher', () => {
  let cipher: Cipher

  before(() => {
    const keyManager = new KeyManager(parseKeyData(data))
    cipher = new Cipher(keyManager)
  })

  it('generates the IV and salt', async () => {
    await Promise.all(data.data.map(async (data) => {
      const encrypted = await cipher.generate([uint8ArrayFromString(data.plaintext, 'base64')])

      assert.deepEqual(new Uint8Array(encrypted.iv), uint8ArrayFromString(data.iv, 'base64'))
      assert.deepEqual(new Uint8Array(encrypted.salt), uint8ArrayFromString(data.salt, 'base64'))
    }))
  })

  it('encrypts data', async () => {
    await Promise.all(data.data.map(async (data): Promise<void> => {
      const itr = cipher.encrypt([uint8ArrayFromString(data.plaintext, 'base64')], await cipher.generate([uint8ArrayFromString(data.plaintext, 'base64')]))
      const encrypted = concat(await all(itr))

      assert.deepEqual(encrypted, uint8ArrayFromString(data.encrypted, 'base64'))
    }))
  })
})
