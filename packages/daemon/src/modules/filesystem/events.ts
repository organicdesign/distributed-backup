import { Event, type EventTarget } from 'ts-event-target'
import type { Entry } from './interface.js'
import type { CID } from 'multiformats/cid'

export type EventTypes = 'file:added'

export class FileSystemEvent extends Event<EventTypes> {
  readonly entry: Entry
  readonly path: string
	readonly group: CID

	constructor (type: EventTypes, group: CID, path: string, entry: Entry) {
    super(type)

    this.entry = entry
    this.path = path
		this.group = group
  }
}

export type Events = EventTarget<[FileSystemEvent]>
