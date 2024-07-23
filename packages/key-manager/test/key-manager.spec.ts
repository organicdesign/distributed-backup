import assert from 'assert/strict'
import { generateKeyData, parseKeyData, KeyManager, type KeyData } from '../src/index.js'
import rawData from './data.js'

let data: Array<typeof rawData[0] & { keyManager: KeyManager } & { keyData: KeyData }>

describe('key manager', () => {
  before(async () => {
    data = await Promise.all(rawData.map(async r => {
      const encodedKeyData = await generateKeyData(r.mnemonic, r.name)
      const keyData = parseKeyData(encodedKeyData)
      const keyManager = new KeyManager(keyData)

      return { ...r, keyManager, keyData }
    }))
  })

  it('returns the psk', () => {
    for (const d of data) {
      assert.deepEqual(d.keyData.psk, d.keyManager.getPskKey())
    }
  })

  it('returns the aes key', () => {
    for (const d of data) {
      const key = d.keyData.key.deriveHardened(2)

      assert.deepEqual(key.privateKey, d.keyManager.aesKey)
    }
  })

  it('returns the hmac key', () => {
    for (const d of data) {
      const key = d.keyData.key.deriveHardened(3)

      assert.deepEqual(key.privateKey, d.keyManager.hmacKey)
    }
  })

  it('returns a libp2p peerId with a matching private key', async () => {
    await Promise.all(data.map(async d => {
      const peerId = await d.keyManager.getPeerId()
      const key = d.keyData.key.deriveHardened(0)

      assert(key.privateKey != null)
      assert(peerId.privateKey != null)

      assert.deepEqual(new Uint8Array(key.privateKey), (peerId.privateKey).slice(4))
    }))
  })

  it('returns a welo identity with a matching public key', async () => {
    await Promise.all(data.map(async d => {
      const weloId = await d.keyManager.getWeloIdentity()
      const key = d.keyData.key.deriveHardened(1)

      assert.deepEqual(new Uint8Array(key.publicKey), weloId.pubkey.bytes.slice(4))
    }))
  })
})
