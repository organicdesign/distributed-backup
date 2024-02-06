import Path from 'path'
import { fileURLToPath } from 'url'

export default Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../../../')
