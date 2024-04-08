import Path from 'path'
import { fileURLToPath } from 'url'

export const packagePath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../../')

export const modulesPath = Path.join(packagePath, '../../node_modules')
