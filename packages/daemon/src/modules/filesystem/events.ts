import { Event, type EventTarget } from 'ts-event-target'
import type { Entry } from './interface.js'

export type EventTypes = 'file:added'

export class FileSystemEvent extends Event<EventTypes> {
  entry: Entry
  path: string

  constructor (type: EventTypes, path: string, entry: Entry) {
    super(type)
    this.entry = entry
    this.path = path
  }
}

export type Events = EventTarget<[FileSystemEvent]>
