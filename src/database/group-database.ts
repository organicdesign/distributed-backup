import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { Database } from "./database.js";
import type { GroupEntry } from "../interface.js";

export class GroupDatabase extends Database<GroupEntry> {
	encode (data: GroupEntry): Uint8Array {
		return uint8ArrayFromString(JSON.stringify(data));
	}

	decode (data: Uint8Array): GroupEntry {
		return JSON.parse(uint8ArrayToString(data));
	}
}
