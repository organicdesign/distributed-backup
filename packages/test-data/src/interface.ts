export interface TestData {
  name: string
  path: string
  hash: Uint8Array
  generatePath(path: string): string
  validate(path: string): Promise<boolean>
}
