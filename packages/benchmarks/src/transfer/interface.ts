export interface TransferBenchmark {
  teardown(): Promise<void>
  run(): Promise<void>
  warmup(): Promise<void>
}
