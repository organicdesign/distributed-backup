export interface TransferBenchmark {
  blocks: number
  size: number
  teardown(): Promise<void>
  run(): Promise<void>
  warmup?(): Promise<void>
}

export interface TransferImplementation {
  label: string
  name: string
  create(): Promise<TransferBenchmark>
  results: number[]
  fileSize: number
  size: number
  blocks: number
}

export interface ImplementationCreator {
  (
    path: string,
    data: string,
    options: Partial<{ persistent: boolean, chunker: string }>
  ): Promise<TransferBenchmark>
}
