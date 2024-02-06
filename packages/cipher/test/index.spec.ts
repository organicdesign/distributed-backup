import assert from 'assert/strict'
import all from 'it-all'
import { KeyManager, parseKeyData } from 'key-manager'
import { concat } from 'uint8arrays/concat'
import { Cipher } from '../src/index.js'

const rawKeyData = {
  key: 'DvXno3utxkbQ4WPXZCTzDcR8hbgnyZWR3bQjx65qrcva-3XxC865bs4H4vJE8pe54Swu3XyzUg788Dk83eQMS9LzQ',
  psk: '/key/swarm/psk/1.0.0/\n/base16/\nefd6014a194d0c7af65aa408d0452e3e22d35e6e0be3ece264cd3a1bd68b48fa'
}

const data = [
  {
    plaintext: new Uint8Array([0, 1, 2]),
    iv: new Uint8Array([216, 176, 205, 76, 193, 151, 212, 45, 102, 41, 232, 54, 239, 90, 72, 192]),
    salt: new Uint8Array([101, 122, 186, 46, 211, 161, 94, 177, 188, 85, 241, 34, 204, 125, 161, 99]),
    encrypted: new Uint8Array([255, 140, 25, 15, 115, 223, 81, 122, 42, 64, 190, 188, 119, 247, 99, 106])
  }
]

describe('cipher', () => {
  let cipher: Cipher

  before(() => {
    const keyManager = new KeyManager(parseKeyData(rawKeyData))
    cipher = new Cipher(keyManager)
  })

  it('generates the IV and salt', async () => {
    await Promise.all(data.map(async (data) => {
      const encrypted = await cipher.generate([data.plaintext])

      assert.deepEqual(new Uint8Array(encrypted.iv), data.iv)
      assert.deepEqual(new Uint8Array(encrypted.salt), data.salt)
    }))
  })

  it('encrypts data', async () => {
    await Promise.all(data.map(async (data) => {
      const itr = cipher.encrypt([data.plaintext], await cipher.generate([data.plaintext]))
      const encrypted = concat(await all(itr))

      assert.deepEqual(encrypted, data.encrypted)
    }))
  })
})
