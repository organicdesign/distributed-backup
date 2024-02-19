import { Event, type EventTarget } from 'ts-event-target'
import type { Entry } from './interface.js'

export type EventTypes = 'file:added'

export class FileSystemEvent extends Event<EventTypes> {
  entry: Entry

  constructor (type: EventTypes, entry: Entry) {
    super(type)
    this.entry = entry
  }
}

export type Events = EventTarget<[FileSystemEvent]>
