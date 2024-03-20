import Path from 'path'
import { projectPath } from '@/utils.js'

export const testPath = Path.join(projectPath, 'packages/daemon/test-out/')

export const mkTestPath = (name: string): string => Path.join(testPath, name)
