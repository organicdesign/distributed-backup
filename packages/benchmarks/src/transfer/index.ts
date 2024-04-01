/* eslint-disable no-console,no-loop-func */
import debug from 'debug'
import prettyBytes from 'pretty-bytes'
import { Bench } from 'tinybench'
import { createTransferBench } from './create-transfer-bench.js'
import type { TransferBenchmark } from './interface.js'

const log = debug('bench:transfer')

const ITERATIONS = parseInt(process.env.ITERATIONS ?? '3')
const MIN_TIME = parseInt(process.env.MIN_TIME ?? '1')
const RESULT_PRECISION = 2

const zeros = [
  0, // 1b
  3, // 1kb
  6 // 1mb
]

const sizes = zeros.map(z => 10 ** z)

const impls: Array<{
  name: string
  create(): Promise<TransferBenchmark & { size: number }>
  results: number[] }
> = sizes.map(size => ({
  name: `${prettyBytes(size)}`,
  create: async () => {
    const bench = await createTransferBench(size)

    return { ...bench, size }
  },
  results: []
}))

async function main (): Promise<void> {
  const suite = new Bench({
    iterations: ITERATIONS,
    time: MIN_TIME
  })

  for (const impl of impls) {
    const run = async function (): Promise<void> {
      log('Start: setup')
      const subject = await impl.create()
      log('End: setup')

      await subject.warmup()
      const start = performance.now()
      await subject.run()
      impl.results.push(performance.now() - start)

      log('Start: teardown')
      await subject.teardown()
      log('End: teardown')
    }

    const hooks = {
      beforeEach: async () => {
        log(`Start: test ${impl.name}`)
      },
      afterEach: async () => {
        log(`End: test ${impl.name}`)
      }
    }

    suite.add(impl.name, run, hooks)
  }

  await suite.run()

  console.table(suite.tasks.map(({ name, result }) => {
    return {
      'File Size': name,
      'runs/s': result?.hz.toFixed(RESULT_PRECISION),
      'ms/run': result?.period.toFixed(RESULT_PRECISION),
      runs: result?.samples.length,
      p99: result?.p99.toFixed(RESULT_PRECISION)
    }
  }))
}

main().catch(err => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})
