import assert from 'assert/strict'
import { type z } from 'zod'
import setupSigint from '../../src/modules/sigint/index.js'
import tick from '../../src/modules/tick/index.js'
import mockConfig from './mock-config.js'

describe('tick', () => {
  it('returns default tick interval', async () => {
    const sigint = await setupSigint()

    const m = await tick({
      config: { config: {}, get: (schema: z.AnyZodObject) => schema.parse({}) },
      sigint
    })

    assert.deepEqual(m.config, { tickInterval: 600 })

    await sigint.interupt()
  })

  it('returns config tick interval', async () => {
    const tickInterval = 100
    const sigint = await setupSigint()

    const m = await tick({
      config: mockConfig({ tickInterval }),
      sigint
    })

    assert.deepEqual(m.config, { tickInterval })

    await sigint.interupt()
  })

  it('returns ticks every interval', async () => {
    const tickInterval = 5
    const checkTimes = 6
    const sigint = await setupSigint()

    const m = await tick({
      config: mockConfig({ tickInterval }),
      sigint
    })

    const before = Date.now()

    await new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, (checkTimes + 4) * tickInterval)
      let timesCalled = 0

      m.register(() => {
        timesCalled++

        if (timesCalled >= checkTimes) {
          resolve()
        }
      })
    })

    const after = Date.now()

    const delta = after - before

    assert(delta < tickInterval * (checkTimes + 2))
    assert(delta > tickInterval * (checkTimes - 2))

    await sigint.interupt()
  })
})
