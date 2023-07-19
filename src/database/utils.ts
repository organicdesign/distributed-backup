import { Welo, Address } from "../../../welo/dist/src/index.js";
import type { KeyvalueDB } from "../interface.js";

export const createGroup = async (welo: Welo, name: string, peers: Uint8Array[]): Promise<KeyvalueDB> => {
	const manifest = await welo.determine({
		name,
		meta: { type: "group" },
		access: {
			protocol: "/hldb/access/static",
			config: { write: peers }
		}
	});

	return await welo.open(manifest) as unknown as KeyvalueDB;
};

export const joinGroup = async (welo: Welo, address: string): Promise<KeyvalueDB> => {
	const manifest = await welo.fetch(Address.fromString(address));

	return await welo.open(manifest) as unknown as KeyvalueDB;
};
