import { cidstring } from "../../node_modules/welo/dist/src/utils/index.js";
import { HeadsExchange } from "../../node_modules/welo/dist/src/utils/heads-exchange.js";
import { getHeads, addHeads } from "../../node_modules/welo/dist/src/utils/replicator.js";
import type { Database } from "welo";
import type { Peer } from "@libp2p/interface/peer-store";
import type { Libp2p } from "@libp2p/interface";

export const sync = async (libp2p: Libp2p, peer: Peer, database: Database, options: Partial<{ reverseSync: boolean, collisionRate: number, validate: boolean, rounds: number }> = {}): Promise<void> => {
	if (!await libp2p.peerStore.has(peer.id)) {
		await libp2p.peerStore.save(peer.id, peer)
	}

	// We need to dial so that libp2p can update multiaddrs.
	await libp2p.dial(peer.id)

	const protocol = `/hldb/replicator/he/1.0.0/${cidstring(database.manifest.address.cid)}`
	const stream = await libp2p.dialProtocol(peer.id, protocol)
	const heads = await getHeads(database.replica)
	const he = new HeadsExchange({
		stream,
		heads,
		remotePeerId: peer.id,
		collisionRate: options.collisionRate ?? 0.1,
		localPeerId: libp2p.peerId
	})

	// eslint-disable-next-line no-console
	const pipePromise = he.pipe().catch(console.error)

	if (!(options.reverseSync ?? true)) {
		await pipePromise
		he.close()
		await stream.close()
		return
	}

	try {
		for (let i = 0; i < (options.rounds ?? 5); i++) {
			const seed = i === 0 ? undefined : Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
			const newHeads = await he.getHeads(seed)

			await addHeads(newHeads, database.replica, database.components)

			if (options.validate ?? true) {
				const matches = await he.verify()

				if (matches) {
					break
				}
			}
		}
	} catch (error) {
		// Ignore errors.
	}

	he.close()
	await stream.close()
};
