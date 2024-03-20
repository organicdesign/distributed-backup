import assert from 'assert/strict'
import tick from '../../src/modules/tick/index.js'
import { z } from 'zod'

describe('tick', () => {
  it('returns default tick interval', async () => {
    const m = await tick({
      config: { config: {}, get: (schema: z.AnyZodObject) => schema.parse({}) }
    })

    assert.deepEqual(m.config, { tickInterval: 600 })
  })
})
