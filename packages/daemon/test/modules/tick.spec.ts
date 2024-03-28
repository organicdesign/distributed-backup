import assert from 'assert/strict'
import { createTick } from '../../src/common/tick.js'

describe('tick', () => {
  it('returns ticks every interval', async () => {
    const tickInterval = 5
    const checkTimes = 6
    const tick = await createTick(tickInterval)

    const before = Date.now()

    await new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, (checkTimes + 4) * tickInterval)
      let timesCalled = 0

      tick.add(() => {
        timesCalled++

        if (timesCalled >= checkTimes) {
          resolve()
        }
      })
    })

    const after = Date.now()

    await tick.stop()

    const delta = after - before

    assert(delta < tickInterval * (checkTimes + 2))
    assert(delta > tickInterval * (checkTimes - 2))
  })
})
