import runNode from './utils/run-node.js'

describe('lifecycle', () => {
  let proc: Awaited<ReturnType<typeof runNode>>

  before(async () => {
    proc = await runNode('lifecycle')
  })

  it('starts cleanly', async () => {
    await proc.start()
  })

  it('stops cleanly', async () => {
    await proc.stop()
  })
})
