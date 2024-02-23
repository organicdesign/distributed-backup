import {
  Addresses,
  Connect,
  Connections,
  CountPeers,
  CreateGroup,
  Delete,
  Edit,
  ExportRevision,
  Export,
  GetStatus,
  ID,
  Import,
  JoinGroup,
  ListGroups,
  ListRevisions,
  List,
  ReadRevision,
  Read,
  SetPriority,
  Sync,
  Write
} from '@organicdesign/db-rpc-interfaces'
import { createNetClient, type NetClient } from '@organicdesign/net-rpc'

export class Client {
  private readonly client: NetClient

  constructor (socket: string) {
    this.client = createNetClient(socket)
  }

  stop (): void {
    this.client.close()
  }

  async addresses (): Promise<Addresses.Return> {
    const params: Addresses.Params = {}
    const raw = await this.client.rpc.request(Addresses.name, params)

    return Addresses.Return.parse(raw)
  }

  async connect (address: Connect.Params['address']): Promise<Connect.Return> {
    const params: Connect.Params = { address }
    const raw = await this.client.rpc.request(Connect.name, params)

    return Connect.Return.parse(raw)
  }

  async connections (): Promise<Connections.Return> {
    const params: Connections.Params = {}
    const raw = await this.client.rpc.request(Connections.name, params)

    return Connections.Return.parse(raw)
  }

  async countPeers (cids: CountPeers.Params['cids']): Promise<CountPeers.Return> {
    const params: CountPeers.Params = { cids }
    const raw = await this.client.rpc.request(CountPeers.name, params)

    return CountPeers.Return.parse(raw)
  }

  async createGroup (name: CreateGroup.Params['name'], peers: CreateGroup.Params['peers'] = []): Promise<CreateGroup.Return> {
    const params: CreateGroup.Params = { name, peers }
    const raw = await this.client.rpc.request(CreateGroup.name, params)

    return CreateGroup.Return.parse(raw)
  }

  async delete (group: Delete.Params['group'], path: Delete.Params['path']): Promise<Delete.Return> {
    const params: Delete.Params = { group, path }
    const raw = await this.client.rpc.request(Delete.name, params)

    return Delete.Return.parse(raw)
  }

  async edit (group: Edit.Params['group'], path: Edit.Params['path'], options: Omit<Edit.Params, 'group' | 'path'> = {}): Promise<Edit.Return> {
    const params: Edit.Params = { group, path, ...options }
    const raw = await this.client.rpc.request(Edit.name, params)

    return Edit.Return.parse(raw)
  }

  async exportRevision (
    group: ExportRevision.Params['group'],
    path: ExportRevision.Params['path'],
    author: ExportRevision.Params['author'],
    sequence: ExportRevision.Params['sequence'],
    outPath: ExportRevision.Params['outPath']
  ): Promise<ExportRevision.Return> {
    const params: ExportRevision.Params = { group, path, outPath, author, sequence }
    const raw = await this.client.rpc.request(ExportRevision.name, params)

    return ExportRevision.Return.parse(raw)
  }

  async export (group: Export.Params['group'], path: Export.Params['path'], outPath: Export.Params['outPath']): Promise<Export.Return> {
    const params: Export.Params = { group, path, outPath }
    const raw = await this.client.rpc.request(Export.name, params)

    return Export.Return.parse(raw)
  }

  async getStatus (cids: GetStatus.Params['cids']): Promise<GetStatus.Return> {
    const params: GetStatus.Params = { cids }
    const raw = await this.client.rpc.request(GetStatus.name, params)

    return GetStatus.Return.parse(raw)
  }

  async id (): Promise<ID.Return> {
    const params: ID.Params = {}
    const raw = await this.client.rpc.request(ID.name, params)

    return ID.Return.parse(raw)
  }

  async import (group: Import.Params['group'], inPath: Import.Params['inPath'], options: Omit<Import.Params, 'group' | 'inPath'> = {}): Promise<Import.Return> {
    const params: Import.Params = { group, inPath, ...options }
    const raw = await this.client.rpc.request(Import.name, params)

    return Import.Return.parse(raw)
  }

  async joinGroup (group: JoinGroup.Params['group']): Promise<JoinGroup.Return> {
    const params: JoinGroup.Params = { group }
    const raw = await this.client.rpc.request(JoinGroup.name, params)

    return JoinGroup.Return.parse(raw)
  }

  async listGroups (): Promise<ListGroups.Return> {
    const params: ListGroups.Params = {}
    const raw = await this.client.rpc.request(ListGroups.name, params)

    return ListGroups.Return.parse(raw)
  }

  async listRevisions (group: ListRevisions.Params['group'], path: ListRevisions.Params['path']): Promise<ListRevisions.Return> {
    const params: ListRevisions.Params = { group, path }
    const raw = await this.client.rpc.request(ListRevisions.name, params)

    return ListRevisions.Return.parse(raw)
  }

  async list (options: List.Params = {}): Promise<List.Return> {
    const params: List.Params = { ...options }
    const raw = await this.client.rpc.request(List.name, params)

    return List.Return.parse(raw)
  }

  async readRevision (
    group: ReadRevision.Params['group'],
    path: ReadRevision.Params['path'],
    author: ReadRevision.Params['author'],
    sequence: ReadRevision.Params['sequence'],
    options: Omit<ReadRevision.Params, 'group' | 'path' | 'author' | 'sequence'>
  ): Promise<ReadRevision.Return> {
    const params: ReadRevision.Params = { group, path, author, sequence, ...options }
    const raw = await this.client.rpc.request(ReadRevision.name, params)

    return ReadRevision.Return.parse(raw)
  }

  async read (group: Read.Params['group'], path: Read.Params['path'], options: Omit<Read.Params, 'group' | 'path'>): Promise<Read.Return> {
    const params: Read.Params = { group, path, ...options }
    const raw = await this.client.rpc.request(Read.name, params)

    return Read.Return.parse(raw)
  }

  async setPriority (group: SetPriority.Params['group'], path: SetPriority.Params['path'], priority: SetPriority.Params['priority']): Promise<SetPriority.Return> {
    const params: SetPriority.Params = { group, path, priority }
    const raw = await this.client.rpc.request(SetPriority.name, params)

    return SetPriority.Return.parse(raw)
  }

  async sync (): Promise<Sync.Return> {
    const params: Sync.Params = {}
    const raw = await this.client.rpc.request(Sync.name, params)

    return Sync.Return.parse(raw)
  }

  async write (group: Write.Params['group'], path: Write.Params['path'], data: Write.Params['data'], options: Omit<Write.Params, 'group' | 'path' | 'data'>): Promise<Write.Return> {
    const params: Write.Params = { group, path, data, ...options }
    const raw = await this.client.rpc.request(Write.name, params)

    return Write.Return.parse(raw)
  }
}

export const createClient = (socket: string): Client => {
  return new Client(socket)
}
