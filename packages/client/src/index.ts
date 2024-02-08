import { createNetClient, type NetClient } from '@organicdesign/net-rpc'
import { type AddParams, AddReturn } from 'rpc-interfaces'

export class Client {
  private readonly client: NetClient

  constructor (socket: string) {
    this.client = createNetClient(socket)
  }

  stop (): void {
    this.client.close()
  }

  async add (params: AddParams): Promise<AddReturn> {
    const raw = await this.client.rpc.request('add', params)

    return AddReturn.parse(raw)
  }
}

export const createClient = (socket: string): Client => {
  return new Client(socket)
}
