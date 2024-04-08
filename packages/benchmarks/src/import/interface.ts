export interface ImportBenchmark {
  teardown(): Promise<void>
  run(): Promise<{
    cid: string
    blocks: number
    size: number
  }>
}

export interface ImportImplementation {
  name: string
  create(): Promise<ImportBenchmark>
  results: number[]
  fileSize: number
  size: number
  blocks: number
}
