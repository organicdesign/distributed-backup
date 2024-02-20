import { createNetServer } from '@organicdesign/net-rpc'
import type { Module } from '@/interface.js'

export interface Init extends Record<string, unknown> { socket: string }

export interface Requires extends Record<string, unknown> {}

export interface Provides extends Record<string, unknown> {
  register (name: string, method: (arg: unknown) => any): void
}

const module: Module<Init, Requires, Provides> = async (_, init) => {
  const { rpc, close } = await createNetServer(init.socket)

  const register = (name: string, method: (arg: unknown) => any): void => {
    rpc.addMethod(name, method)
  }

  return { components: { register }, stop: close }
}

export default module
