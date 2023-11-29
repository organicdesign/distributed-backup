import { sync } from "../../manual/index.js";
import { type Components } from "../../interface.js";

export const name = "sync";

export const method = (components: Components) => async () => {
	const peers = components.libp2p.getPeers();
	const databases = components.welo.opened.values();

	const promises: Promise<void>[] = [];

	for (const peerId of peers) {
		const peer = await components.libp2p.peerStore.get(peerId);

		for (const database of databases) {
			promises.push(sync(components.libp2p, peer, database));
		}
	}

	await Promise.all(promises);
};
