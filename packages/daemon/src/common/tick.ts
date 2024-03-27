import { Event, EventTarget } from 'ts-event-target'
import type { Startable } from '@libp2p/interface'

export class MethodErrorEvent extends Event<'method:error'> {
  readonly error: Error

  constructor (error: Error) {
    super('method:error')

    this.error = error
  }
}

type Events = EventTarget<[MethodErrorEvent]>

interface Method { (...args: any[]): any }

export class Tick implements Startable {
  private readonly interval: number
  private readonly methods: Method[] = []
  private readonly events: Events = new EventTarget()
  private controller: AbortController = new AbortController()

  constructor (interval: number) {
    this.interval = interval
  }

  add (method: Method): void {
    this.methods.push(method)
  }

  async start (): Promise<void> {
    void this.loop()
  }

  async stop (): Promise<void> {
    this.controller.abort()
		this.controller = new AbortController()
  }

  private get signal (): AbortSignal {
    return this.controller.signal
  }

  private get isAborted (): boolean {
    return this.controller.signal.aborted
  }

  private async loop () {
    for (;;) {
      for (const method of this.methods) {
        try {
          await method()
        } catch (e) {
          const error = e instanceof Error ? e : new Error(JSON.stringify(e))

          this.events.dispatchEvent(new MethodErrorEvent(error))
        }

        if (this.isAborted) {
          return true
        }
      }

      await new Promise<void>(resolve => {
        const listener = () => {
          if (timeout != null) {
            clearTimeout(timeout)
            this.signal.removeEventListener('abort', listener)
            resolve()
          }
        }

        const timeout = setTimeout(() => {
          this.signal.removeEventListener('abort', listener)
          resolve()
        }, this.interval)

        this.signal.addEventListener('abort', listener)
      })

      if (this.isAborted) {
        return
      }
    }
  }
}

export const createTick = async (interval: number): Promise<Tick> => {
  const tick = new Tick(interval)

  await tick.start()

  return tick
}
