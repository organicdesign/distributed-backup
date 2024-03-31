import Path from 'path'
import { fileURLToPath } from 'url'

export const testPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../../')

export const modulesPath = Path.join(testPath, '../../node_modules')
