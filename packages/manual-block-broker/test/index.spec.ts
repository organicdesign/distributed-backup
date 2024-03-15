import assert from 'assert/strict'
import { CID } from 'multiformats/cid'
import { ManualBlockBroker } from '../src/index.js'

const cid = CID.parse('QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH')

describe('manual block broker', () => {
  it('retrieve resolves  when a block is provided', async () => {
    const bb = new ManualBlockBroker()

    const promise = bb.retrieve(cid, {})
    const result = bb.provide(cid, new Uint8Array())

    assert(result)

    await promise
  })
})
