import assert from 'assert/strict'
import { CID } from 'multiformats/cid'
import { ManualBlockBroker } from '../src/index.js'

const cid = CID.parse('QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH')

// Since the block broker does not verify the block it doesn't need to match CID.
const block = new Uint8Array()

describe('manual block broker', () => {
  it('retrieve resolves when a block is provided', async () => {
    const bb = new ManualBlockBroker()
    const promise = bb.retrieve(cid, {})
    const result = bb.provide(cid, block)

    assert(result)
    assert.equal(await promise, block)
  })

  it('retrieve throws when aborted', async () => {
    const bb = new ManualBlockBroker()
    const controller = new AbortController()
    const promise = bb.retrieve(cid, { signal: controller.signal })

    controller.abort()

    await assert.rejects(async () => promise)
  })

  it('provides returns false the block is not requested', () => {
    const bb = new ManualBlockBroker()
    const result = bb.provide(cid, block)

    assert(!result)
  })

  it('provides returns false when aborted', async () => {
    const bb = new ManualBlockBroker()
    const controller = new AbortController()
    const promise = bb.retrieve(cid, { signal: controller.signal })

    controller.abort()

    const result = bb.provide(cid, block)

    assert(!result)
    await assert.rejects(async () => promise)
  })

  it('getWants returns the CID when it is requested', async () => {
    const bb = new ManualBlockBroker()
    const controller = new AbortController()
    const promise = bb.retrieve(cid, { signal: controller.signal })
    const wants = [...bb.getWants()]

    controller.abort()

    assert.deepEqual(wants, [cid])
    await assert.rejects(async () => promise)
  })

  it('getWants no longer returns the CID when it is provided', async () => {
    const bb = new ManualBlockBroker()
    const promise = bb.retrieve(cid, {})

    bb.provide(cid, block)

    assert.equal(await promise, block)

    const wants = [...bb.getWants()]

    assert.deepEqual(wants, [])
  })
})
