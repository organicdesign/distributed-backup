import { createNetClient, type NetClient } from '@organicdesign/net-rpc'
import {
	Import
} from 'rpc-interfaces'

export class Client {
  private readonly client: NetClient

  constructor (socket: string) {
    this.client = createNetClient(socket)
  }

  stop (): void {
    this.client.close()
  }

  async import (params: Import.Params): Promise<Import.Return> {
    const raw = await this.client.rpc.request('import', params)

    return Import.Return.parse(raw)
  }
}

export const createClient = (socket: string): Client => {
  return new Client(socket)
}
