import * as net from 'net'
import * as cborg from 'cborg'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { type Pushable, pushable } from 'it-pushable'
import { JSONRPCServer, type JSONRPCResponse, type JSONRPCRequest } from 'json-rpc-2.0'
import { map, writeToStream } from 'streaming-iterables'
import { Event, EventTarget } from 'ts-event-target'
import type { Socket } from 'net'
import type { Uint8ArrayList } from 'uint8arraylist'

export class RPCEvent extends Event<'error'> {
  readonly code: string

  constructor (code?: string) {
    super('error')

    this.code = code ?? 'UNKNOWN_ERROR'
  }
}

export const createEventTarget = (): EventTarget<[RPCEvent]> => new EventTarget<[RPCEvent]>()

interface Client {
  socket: Socket
  stream: Pushable<JSONRPCResponse>
}

export class RPCServer {
  readonly events = createEventTarget()
  readonly rpc = new JSONRPCServer()
  private readonly path: string
  private readonly clients = new Map<number, Client>()
  private readonly server = net.createServer(socket => { this.handleClient(socket) })
  private readonly genId: () => number

  constructor (path: string) {
    this.path = path

    this.genId = ((): () => number => {
      let id = 0

      return () => id++ % 65536
    })()
  }

  async start (): Promise<void> {
    await new Promise<void>(resolve => this.server.listen(this.path, resolve))
  }

  async stop (): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close(error => { (error != null) ? reject(error) : resolve() })

      for (const [id, { stream, socket }] of this.clients.entries()) {
        stream.end()
        socket.destroy()
        this.clients.delete(id)
      }
    })
  }

  private handleClient (socket: Socket): void {
    const id = this.genId()
    const stream = pushable<JSONRPCResponse>({ objectMode: true })

    this.clients.set(id, { socket, stream })

    // Send responses to the client
    pipe(
      stream,
      map(i => cborg.encode(i)),
      lp.encode,
      writeToStream(socket)
    ).catch(error => {
      const code = (error as Record<string, string> | null)?.code

      this.events.dispatchEvent(new RPCEvent(code))

      socket.destroy(error)
      stream.end(error)
    })

    ;(async () => {
      const itr = pipe(
        socket as AsyncIterable<Uint8Array>,
        i => lp.decode(i),
        map((value: Uint8Array | Uint8ArrayList) => value.subarray()),
        map((i: Uint8Array) => cborg.decode(i) as JSONRPCRequest)
      )

      for await (const data of itr) {
        const response = await this.rpc.receive(data)

        if (response != null) {
          stream.push(response)
        }
      }
    })().catch(error => {
      // Ignore errors because we will close immediately after.
      const code = (error as Record<string, string> | null)?.code

      this.events.dispatchEvent(new RPCEvent(code))
    }).finally(() => {
    // Socket was closed
      stream.end()
      socket.destroy()

      this.clients.delete(id)
    })
  }
}

export const createRPCServer = async (path: string): Promise<RPCServer> => {
  const rpcServer = new RPCServer(path)

  await rpcServer.start()

  return rpcServer
}
