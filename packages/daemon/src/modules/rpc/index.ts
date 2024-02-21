import { createNetServer } from '@organicdesign/net-rpc'
import type { Module } from '@/interface.js'
import type { Provides as Argv } from '@/modules/argv/index.js'
import type { Provides as Sigint } from '@/modules/sigint/index.js'

export interface Requires extends Record<string, unknown> {
  argv: Argv
  sigint: Sigint
}

export interface Provides extends Record<string, unknown> {
  addMethod (name: string, method: (arg: unknown) => any): void
}

const module: Module<Provides, Requires> = async (components) => {
  const { rpc, close } = await createNetServer(components.argv.socket)

  const addMethod = (name: string, method: (arg: unknown) => any): void => {
    rpc.addMethod(name, method)
  }

  components.sigint.onInterupt(close)

  return { addMethod }
}

export default module
