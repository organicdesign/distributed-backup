import Path from 'path'
import { fileURLToPath } from 'url'

export const testPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-out')

export const mkTestPath = (name: string): string => Path.join(testPath, name)
