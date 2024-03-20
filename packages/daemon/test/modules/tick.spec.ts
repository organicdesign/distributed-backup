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

    sigint.interupt(false)
  })

  it('returns config tick interval', async () => {
    const tickInterval = 100
    const sigint = await setupSigint()

    const m = await tick({
      config: mockConfig({ tickInterval }),
      sigint
    })

    assert.deepEqual(m.config, { tickInterval })

    sigint.interupt(false)
  })
})
