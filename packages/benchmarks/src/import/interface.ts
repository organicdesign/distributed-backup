export interface ImportBenchmark {
  teardown(): Promise<void>
  run(): Promise<{
    cid: string
    blocks: number
    size: number
  }>
}

export interface ImportImplementation {
  label: string
  name: string
  create(): Promise<ImportBenchmark>
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
  ): Promise<ImportBenchmark>
}
