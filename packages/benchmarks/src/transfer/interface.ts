export interface TransferBenchmark {
  blocks: number
  size: number
  teardown(): Promise<void>
  run(): Promise<void>
  warmup(): Promise<void>
}

export interface TransferImplementation {
  name: string
  create(): Promise<TransferBenchmark>
  results: number[]
  fileSize: number
  size: number
  blocks: number
}
