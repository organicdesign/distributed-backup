import { execFile as execFileCb } from 'child_process'
import Path from 'path'
import { promisify } from 'util'
import projectPath from './project-path.js'

const execFile = promisify(execFileCb)

export default async (name: string, command: string, ...args: string[]): Promise<any> => {
  const socketArgs = [
    Path.join(projectPath, 'node_modules/cli/dist/src/index.js'),
    '-s', Path.join(projectPath, `e2e-tests/${name}.socket`),
    '--json', 'true'
  ]

  const run = async (...args: string[]): Promise<{ stdout: string, stderr: string }> => execFile('node', [...socketArgs, ...args])

  const { stdout } = await run(command, ...args)

  try {
    return JSON.parse(stdout)
  } catch (error) {
    throw new Error(`invalid json: '${stdout}'`)
  }
}
