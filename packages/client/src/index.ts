import { createNetClient, type NetClient } from '@organicdesign/net-rpc'
import { type ImportParams, ImportReturn } from 'rpc-interfaces'

export class Client {
  private readonly client: NetClient

  constructor (socket: string) {
    this.client = createNetClient(socket)
  }

  stop (): void {
    this.client.close()
  }

  async import (params: ImportParams): Promise<ImportReturn> {
    const raw = await this.client.rpc.request('import', params)

    return ImportReturn.parse(raw)
  }
}

export const createClient = (socket: string): Client => {
  return new Client(socket)
}
