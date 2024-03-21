import assert from 'assert/strict'
import sigint from '../../src/modules/sigint/index.js'

describe('sigint', () => {
  it('calls the interupt method when interupt gets called', async () => {
    const m = await sigint()

    let called = 0

    m.onInterupt(() => called++)
    await m.interupt()

    assert.equal(called, 1)
  })
})
