import * as net from 'net'
import * as cborg from 'cborg'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { JSONRPCClient, type JSONRPCResponse, type JSONRPCRequest } from 'json-rpc-2.0'
import { map, writeToStream } from 'streaming-iterables'
import { createEventTarget, RPCEvent } from './events.js'
import type { AbortOptions } from 'interface-store'
import type { Socket } from 'net'
import type { Uint8ArrayList } from 'uint8arraylist'

export class RPCClient {
  readonly events = createEventTarget()
  readonly rpc: JSONRPCClient<ReturnType<() => void> | AbortOptions>
  private readonly socket: Socket
  private readonly stream = pushable<JSONRPCRequest>({ objectMode: true })

  constructor (path: string) {
    this.socket = net.connect({ path })

    this.rpc = new JSONRPCClient((request: JSONRPCRequest, options) => {
      this.stream.push(request)

      if (request.id != null && options?.signal != null) {
        options.signal.onabort = () => {
          this.rpc.notify('rpc-abort', { id: request.id })
        }
      }
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
    this.rpc.rejectAllPendingRequests('stopped')
  }
}

export const createRPCClient = (path: string): RPCClient => {
  const rpcClient = new RPCClient(path)

  rpcClient.start()

  return rpcClient
}
