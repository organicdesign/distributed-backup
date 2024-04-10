import * as net from 'net'
import * as cborg from 'cborg'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { JSONRPCClient, type JSONRPCResponse, type JSONRPCRequest } from 'json-rpc-2.0'
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

export class RPCClient {
  readonly events = createEventTarget()
  readonly rpc: JSONRPCClient
  private readonly socket: Socket
  private readonly stream = pushable<JSONRPCRequest>({ objectMode: true })

  constructor (path: string) {
    this.socket = net.connect({ path })

    this.rpc = new JSONRPCClient(async request => {
      this.stream.push(request)
    })
  }

  start (): void {
    // Send responses to the client
    pipe(
      this.stream,
      map(i => cborg.encode(i)),
      lp.encode,
      writeToStream(this.socket)
    ).catch(error => {
      const code = (error as Record<string, string> | null)?.code

      this.events.dispatchEvent(new RPCEvent(code))

      this.socket.destroy(error)
      this.stream.end(error)
    })

    ;(async () => {
      const itr = pipe(
        this.socket as AsyncIterable<Uint8Array>,
        i => lp.decode(i),
        map((value: Uint8Array | Uint8ArrayList) => value.subarray()),
        map((i: Uint8Array) => cborg.decode(i) as JSONRPCResponse)
      )

      for await (const data of itr) {
        this.rpc.receive(data)
      }
    })().catch(error => {
      // Ignore errors because we will close immediately after.
      const code = (error as Record<string, string> | null)?.code

      this.events.dispatchEvent(new RPCEvent(code))
    }).finally(() => {
      this.stop()
    })
  }

  stop (): void {
    this.stream.end()
    this.socket.destroy()
  }
}

export const createRPCClient = (path: string): RPCClient => {
  const rpcClient = new RPCClient(path)

  rpcClient.start()

  return rpcClient
}
