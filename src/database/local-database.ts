import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { Database } from "./database.js";
import type { LocalEntry } from "../interface.js";

export class LocalDatabase extends Database<LocalEntry> {
	encode (data: LocalEntry): Uint8Array {
		return uint8ArrayFromString(JSON.stringify(data));
	}

	decode (data: Uint8Array): LocalEntry {
		return JSON.parse(uint8ArrayToString(data));
	}
}
