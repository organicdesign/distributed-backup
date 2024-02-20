import { createNetServer } from '@organicdesign/net-rpc'
import type { Module } from '@/interface.js'
import type { Provides as Argv } from '@/modules/argv/index.js'

export interface Requires extends Record<string, unknown> {
  argv: Argv
}

export interface Provides extends Record<string, unknown> {
  addMethod (name: string, method: (arg: unknown) => any): void
}

const module: Module<Provides, Requires> = async (components) => {
  const { rpc, close } = await createNetServer(components.argv.socket)

  const addMethod = (name: string, method: (arg: unknown) => any): void => {
    rpc.addMethod(name, method)
  }

  return { components: { addMethod }, stop: close }
}

export default module
