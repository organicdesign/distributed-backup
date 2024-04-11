import { Event, EventTarget } from 'ts-event-target'

export class RPCEvent extends Event<'error'> {
  readonly code: string

  constructor (code?: string) {
    super('error')

    this.code = code ?? 'UNKNOWN_ERROR'
  }
}

export const createEventTarget = (): EventTarget<[RPCEvent]> => new EventTarget<[RPCEvent]>()
