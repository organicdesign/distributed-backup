import assert from 'assert/strict'
import { KeyManager, parseKeyData } from '@organicdesign/db-key-manager'
import all from 'it-all'
import { concat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Cipher } from '../src/index.js'
import data from './data.js'

const parseStr = (data: string): Uint8Array => uint8ArrayFromString(data, 'base64')

describe('cipher', () => {
  let cipher: Cipher

  before(() => {
    const keyManager = new KeyManager(parseKeyData(data))
    cipher = new Cipher(keyManager)
  })

  it('generates the IV and salt', async () => {
    await Promise.all(data.data.map(async (data) => {
      const encrypted = await cipher.generate([parseStr(data.plaintext)])

      assert.deepEqual(new Uint8Array(encrypted.iv), parseStr(data.iv))
      assert.deepEqual(new Uint8Array(encrypted.salt), parseStr(data.salt))
    }))
  })

  it('encrypts data', async () => {
    await Promise.all(data.data.map(async (data): Promise<void> => {
      const itr = cipher.encrypt([parseStr(data.plaintext)], await cipher.generate([parseStr(data.plaintext)]))
      const encrypted = concat(await all(itr))

      assert.deepEqual(encrypted, parseStr(data.encrypted))
    }))
  })
})
