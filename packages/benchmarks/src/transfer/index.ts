/* eslint-disable no-console,no-loop-func */
import fs from 'fs/promises'
import Path from 'path'
import debug from 'debug'
import prettyBytes from 'pretty-bytes'
import { Bench } from 'tinybench'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import generateFile from '../utils/generate-file.js'
import { packagePath } from '../utils/paths.js'
import { createTransferBench } from './transfer-bench.js'
import type { TransferImplementation } from './interface.js'

const argv = await yargs(hideBin(process.argv))
  .option({
    iterations: {
      alias: 'i',
      type: 'number',
      default: 3
    }
  })
  .option({
    minTime: {
      type: 'number',
      default: 1
    }
  })
  .option({
    precision: {
      type: 'number',
      default: 2
    }
  })
  .option({
    persistent: {
      alias: 'p',
      type: 'boolean',
      default: false
    }
  })
  .parse()

const log = debug('bench:transfer')

const sizes = [
  0, // 1b
  3, // 1kb
  6, // 1mb
  7, // 10mb
  8, // 100mb
  9 //  1gb
].map(z => 10 ** z)

const impls: TransferImplementation[] = sizes.map(size => ({
  name: `${prettyBytes(size)}`,
  create: async () => createTransferBench(size, argv.persistent),
  results: [],
  fileSize: size,
  size: 0,
  blocks: 0
}))

const dataPath = Path.join(packagePath, 'test-out')

async function main (): Promise<void> {
  const suite = new Bench({
    iterations: argv.iterations,
    time: argv.minTime,

    async setup (task) {
      const impl = impls.find(({ name }) => task.name.includes(name))

      if (impl == null) {
        return
      }

      await fs.mkdir(dataPath, { recursive: true })
      const dataFile = Path.join(dataPath, `${impl.fileSize}.data`)
      await generateFile(dataFile, impl.fileSize)
    },

    async teardown (task) {
      const impl = impls.find(({ name }) => task.name.includes(name))

      if (impl == null) {
        return
      }

      const dataFile = Path.join(dataPath, `${impl.fileSize}.data`)
      await fs.rm(dataFile)
    }
  })

  for (const impl of impls) {
    const run = async function (): Promise<void> {
      log('Start: setup')
      const subject = await impl.create()
      log('End: setup')

      await subject.warmup()
      const start = performance.now()
      await subject.run()

      impl.size = subject.size
      impl.blocks = subject.blocks
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
    const impl = impls.find(impl => impl.name === name)

    if (impl == null) {
      throw new Error('got result without implementation')
    }

    const seconds = (result?.period ?? 0) / 1000
    const speed = impl.size / seconds
    const bps = impl.blocks / seconds

    return {
      'File Size': name,
      Size: prettyBytes(impl.size),
      Blocks: impl.blocks,
      'Speed (Size)': `${prettyBytes(speed)}/s`,
      'Speed (Blocks)': `${bps.toFixed(argv.precision)} blocks/s`,
      'Run Time': `${result?.period.toFixed(argv.precision)}ms`,
      Runs: result?.samples.length,
      p99: `${result?.p99.toFixed(argv.precision)}ms`
    }
  }))

  await fs.rm(dataPath, { recursive: true })
}

main().catch(err => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})
