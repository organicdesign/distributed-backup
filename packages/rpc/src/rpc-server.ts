import * as net from 'net'
import { platform } from 'os'
import Path from 'path'
import * as cborg from 'cborg'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { type Pushable, pushable } from 'it-pushable'
import { JSONRPCServer, type JSONRPCResponse, type JSONRPCRequest } from 'json-rpc-2.0'
import { map, writeToStream } from 'streaming-iterables'
import { z } from 'zod'
import { createEventTarget, RPCEvent } from './events.js'
import type { AbortOptions } from 'interface-store'
import type { Socket } from 'net'
import type { Uint8ArrayList } from 'uint8arraylist'

interface Client {
  socket: Socket
  stream: Pushable<JSONRPCResponse>
  controllers: Map<number | string, AbortController>
}

export interface RPCServerOptions {
  retryDelay?: number
  retryCount?: number
}

export class RPCServer {
  readonly events = createEventTarget()
  readonly rpc = new JSONRPCServer<AbortOptions & { id: number }>()
  private readonly path: string
  private readonly clients = new Map<number, Client>()
  private readonly server = net.createServer(socket => { this.handleClient(socket) })
  private readonly genId: () => number
  private readonly options: Required<RPCServerOptions>

  constructor (path: string, options: RPCServerOptions = {}) {
    if (platform() === 'win32') {
      path = Path.join('\\\\.\\pipe', path)
    }

    this.path = path

    this.options = {
      retryCount: options.retryCount ?? 3,
      retryDelay: options.retryDelay ?? 1000
    }

    this.genId = ((): () => number => {
      let id = 0

      return () => id++ % 65536
    })()
  }

  async start (): Promise<void> {
    for (let i = 0; i <= this.options.retryCount; i++) {
      try {
        await new Promise<void>(resolve => this.server.listen(this.path, resolve))
        break
      } catch (e) {
        const code = (e as { code?: string }).code

        if (code === 'EADDRINUSE') {
          if (i >= this.options.retryCount) {
            throw e
          }

          this.events.dispatchEvent(new RPCEvent(code))

          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay))

          this.server.close()
          this.server.listen(this.path)
        } else {
          throw e
        }
      }
    }

    this.rpc.addMethod('rpc-abort', (raw, { id }) => {
      const params = z.object({ id: z.number() }).parse(raw)
      const client = this.clients.get(id)
      const controller = client?.controllers.get(params.id)

      controller?.abort()
    })
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
    const controllers = new Map<string | number, AbortController>()

    this.clients.set(id, { socket, stream, controllers })

    socket.on('close', () => {
      for (const controller of controllers.values()) {
        controller.abort()
      }
    })

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

      const promises: Array<PromiseLike<void>> = []

      for await (const data of itr) {
        if (data.id != null) {
          controllers.set(data.id, new AbortController())
        }

        const signal = data.id == null ? undefined : controllers.get(data.id)?.signal

        promises.push(this.rpc.receive(data, { id, signal }).then(response => {
          if (data.id != null) {
            controllers.delete(data.id)
          }

          if (response != null) {
            stream.push(response)
          }
        }))
      }

      await Promise.all(promises)
    })().catch(error => {
      // Ignore errors because we will close immediately after.
      const code = (error as Record<string, string> | null)?.code

      this.events.dispatchEvent(new RPCEvent(code))
    }).finally(() => {
    // Socket was closed
      stream.end()
      socket.destroy()

      for (const controller of controllers.values()) {
        controller.abort()
      }

      this.clients.delete(id)
    })
  }
}

export const createRPCServer = async (path: string): Promise<RPCServer> => {
  const rpcServer = new RPCServer(path)

  await rpcServer.start()

  return rpcServer
}
