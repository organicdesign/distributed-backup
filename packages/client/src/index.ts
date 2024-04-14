import { createRPCClient, type RPCClient } from '@organicdesign/db-rpc'
import {
  Addresses,
  Connect,
  Connections,
  CountPeers,
  CreateGroup,
  Delete,
  Downloader,
  Edit,
  ExportRevision,
  Export,
  GetSchedule,
  GetState,
  ID,
  Import,
  JoinGroup,
  ListGroups,
  ListRevisions,
  List,
  Pause,
  PutSchedule,
  ReadRevision,
  Read,
  Resume,
  SneakernetReveive,
  SneakernetSend,
  Sync,
  Write
} from '@organicdesign/db-rpc-interfaces'
import type { AbortOptions } from 'interface-store'

const stripAbortOptions = <T>(options: AbortOptions & T): AbortOptions => {
  const signal = options.signal

  delete options.signal

  return { signal }
}

export class Client {
  private readonly client: RPCClient

  constructor (socket: string) {
    this.client = createRPCClient(socket)
  }

  stop (): void {
    this.client.stop()
  }

  async addresses (options: AbortOptions = {}): Promise<Addresses.Return> {
    const params: Addresses.Params = {}
    const raw = await this.client.rpc.request(Addresses.name, params, options)

    return Addresses.Return.parse(raw)
  }

  async connect (address: Connect.Params['address'], options: AbortOptions = {}): Promise<Connect.Return> {
    const params: Connect.Params = { address }
    const raw = await this.client.rpc.request(Connect.name, params, options)

    return Connect.Return.parse(raw)
  }

  async connections (options: AbortOptions = {}): Promise<Connections.Return> {
    const params: Connections.Params = {}
    const raw = await this.client.rpc.request(Connections.name, params, options)

    return Connections.Return.parse(raw)
  }

  async countPeers (cid: CountPeers.Params['cid'], options: AbortOptions = {}): Promise<CountPeers.Return> {
    const params: CountPeers.Params = { cid }
    const raw = await this.client.rpc.request(CountPeers.name, params, options)

    return CountPeers.Return.parse(raw)
  }

  async createGroup (
    name: CreateGroup.Params['name'],
    options: AbortOptions & { peers?: CreateGroup.Params['peers'] } = {}
  ): Promise<CreateGroup.Return> {
    const params: CreateGroup.Params = { name, peers: options.peers ?? [] }
    const raw = await this.client.rpc.request(CreateGroup.name, params)

    return CreateGroup.Return.parse(raw)
  }

  async delete (
    group: Delete.Params['group'],
    path: Delete.Params['path'],
    options: AbortOptions = {}
  ): Promise<Delete.Return> {
    const params: Delete.Params = { group, path }
    const raw = await this.client.rpc.request(Delete.name, params, options)

    return Delete.Return.parse(raw)
  }

  async downloader (
    options: AbortOptions & Downloader.Params = {}
  ): Promise<Downloader.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: Downloader.Params = { ...options }
    const raw = await this.client.rpc.request(Downloader.name, params, abortOptions)

    return Downloader.Return.parse(raw)
  }

  async edit (
    group: Edit.Params['group'],
    path: Edit.Params['path'],
    options: AbortOptions & Omit<Edit.Params, 'group' | 'path'> = {}
  ): Promise<Edit.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: Edit.Params = { group, path, ...options }
    const raw = await this.client.rpc.request(Edit.name, params, abortOptions)

    return Edit.Return.parse(raw)
  }

  async exportRevision (
    group: ExportRevision.Params['group'],
    path: ExportRevision.Params['path'],
    author: ExportRevision.Params['author'],
    sequence: ExportRevision.Params['sequence'],
    outPath: ExportRevision.Params['outPath'],
    options: AbortOptions = {}
  ): Promise<ExportRevision.Return> {
    const params: ExportRevision.Params = { group, path, outPath, author, sequence }
    const raw = await this.client.rpc.request(ExportRevision.name, params, options)

    return ExportRevision.Return.parse(raw)
  }

  async export (
    group: Export.Params['group'],
    path: Export.Params['path'],
    outPath: Export.Params['outPath'],
    options: AbortOptions = {}
  ): Promise<Export.Return> {
    const params: Export.Params = { group, path, outPath }
    const raw = await this.client.rpc.request(Export.name, params, options)

    return Export.Return.parse(raw)
  }

  async getSchedule (
    group: GetSchedule.Params['group'],
    options: AbortOptions & Omit<GetSchedule.Params, 'group'> = {}
  ): Promise<GetSchedule.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: GetSchedule.Params = { group, ...options }
    const raw = await this.client.rpc.request(GetSchedule.name, params, abortOptions)

    return GetSchedule.Return.parse(raw)
  }

  async getState (
    cid: GetState.Params['cid'],
    options: AbortOptions & Omit<GetState.Params, 'cid'> = {}
  ): Promise<GetState.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: GetState.Params = { cid, ...options }
    const raw = await this.client.rpc.request(GetState.name, params, abortOptions)

    return GetState.Return.parse(raw)
  }

  async id (options: AbortOptions = {}): Promise<ID.Return> {
    const params: ID.Params = {}
    const raw = await this.client.rpc.request(ID.name, params, options)

    return ID.Return.parse(raw)
  }

  async import (
    group: Import.Params['group'],
    inPath: Import.Params['inPath'],
    options: AbortOptions & Omit<Import.Params, 'group' | 'inPath'> = {}
  ): Promise<Import.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: Import.Params = { group, inPath, ...options }
    const raw = await this.client.rpc.request(Import.name, params, abortOptions)

    return Import.Return.parse(raw)
  }

  async joinGroup (group: JoinGroup.Params['group'], options: AbortOptions = {}): Promise<JoinGroup.Return> {
    const params: JoinGroup.Params = { group }
    const raw = await this.client.rpc.request(JoinGroup.name, params, options)

    return JoinGroup.Return.parse(raw)
  }

  async listGroups (options: AbortOptions = {}): Promise<ListGroups.Return> {
    const params: ListGroups.Params = {}
    const raw = await this.client.rpc.request(ListGroups.name, params, options)

    return ListGroups.Return.parse(raw)
  }

  async listRevisions (
    group: ListRevisions.Params['group'],
    path: ListRevisions.Params['path'],
    options: AbortOptions = {}
  ): Promise<ListRevisions.Return> {
    const params: ListRevisions.Params = { group, path }
    const raw = await this.client.rpc.request(ListRevisions.name, params, options)

    return ListRevisions.Return.parse(raw)
  }

  async list (options: AbortOptions & List.Params = {}): Promise<List.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: List.Params = { ...options }
    const raw = await this.client.rpc.request(List.name, params, abortOptions)

    return List.Return.parse(raw)
  }

  async pause (options: AbortOptions & Pause.Params = {}): Promise<Pause.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: Pause.Params = { ...options }
    const raw = await this.client.rpc.request(Pause.name, params, abortOptions)

    return Pause.Return.parse(raw)
  }

  async putSchedule (
    group: PutSchedule.Params['group'],
    type: PutSchedule.Params['type'],
    from: PutSchedule.Params['from'],
    to: PutSchedule.Params['to'],
    context: PutSchedule.Params['context'],
    options: AbortOptions = {}
  ): Promise<PutSchedule.Return> {
    const params: PutSchedule.Params = { group, type, from, to, context }
    const raw = await this.client.rpc.request(PutSchedule.name, params, options)

    return PutSchedule.Return.parse(raw)
  }

  async readRevision (
    group: ReadRevision.Params['group'],
    path: ReadRevision.Params['path'],
    author: ReadRevision.Params['author'],
    sequence: ReadRevision.Params['sequence'],
    options: AbortOptions & Omit<ReadRevision.Params, 'group' | 'path' | 'author' | 'sequence'> = {}
  ): Promise<ReadRevision.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: ReadRevision.Params = { group, path, author, sequence, ...options }
    const raw = await this.client.rpc.request(ReadRevision.name, params, abortOptions)

    return ReadRevision.Return.parse(raw)
  }

  async read (
    group: Read.Params['group'],
    path: Read.Params['path'],
    options: AbortOptions & Omit<Read.Params, 'group' | 'path'> = {}
  ): Promise<Read.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: Read.Params = { group, path, ...options }
    const raw = await this.client.rpc.request(Read.name, params, abortOptions)

    return Read.Return.parse(raw)
  }

  async resume (options: AbortOptions & Resume.Params = {}): Promise<Resume.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: Resume.Params = { ...options }
    const raw = await this.client.rpc.request(Resume.name, params, abortOptions)

    return Resume.Return.parse(raw)
  }

  async sync (options: AbortOptions = {}): Promise<Sync.Return> {
    const params: Sync.Params = {}
    const raw = await this.client.rpc.request(Sync.name, params, options)

    return Sync.Return.parse(raw)
  }

  async sneakernetReveive (
    path: SneakernetReveive.Params['path'],
    options: AbortOptions = {}
  ): Promise<SneakernetReveive.Return> {
    const params: SneakernetReveive.Params = { path }
    const raw = await this.client.rpc.request(SneakernetReveive.name, params, options)

    return SneakernetReveive.Return.parse(raw)
  }

  async sneakernetSend (
    path: SneakernetSend.Params['path'],
    options: AbortOptions & Omit<SneakernetSend.Params, 'path'> = {}
  ): Promise<SneakernetSend.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: SneakernetSend.Params = { path, ...options }
    const raw = await this.client.rpc.request(SneakernetSend.name, params, abortOptions)

    return SneakernetSend.Return.parse(raw)
  }

  async write (
    group: Write.Params['group'],
    path: Write.Params['path'],
    data: Write.Params['data'],
    options: AbortOptions & Omit<Write.Params, 'group' | 'path' | 'data'>
  ): Promise<Write.Return> {
    const abortOptions = stripAbortOptions(options)
    const params: Write.Params = { group, path, data, ...options }

    const raw = await this.client.rpc.request(Write.name, params, abortOptions)

    return Write.Return.parse(raw)
  }
}

export const createClient = (socket: string): Client => {
  return new Client(socket)
}
