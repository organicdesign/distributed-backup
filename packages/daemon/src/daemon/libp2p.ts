import { createLibp2p } from "libp2p";
import { yamux } from "@chainsafe/libp2p-yamux";
import { tcp } from "@libp2p/tcp";
import { kadDHT, removePrivateAddressesMapper, removePublicAddressesMapper } from "@libp2p/kad-dht";
import { webSockets } from "@libp2p/websockets";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { noise } from "@chainsafe/libp2p-noise";
import { identify } from "@libp2p/identify";
import { bootstrap } from "@libp2p/bootstrap";
import { preSharedKey } from "@libp2p/pnet";
import { uPnPNAT } from "@libp2p/upnp-nat";
import { autoNAT } from "@libp2p/autonat";
import { circuitRelayTransport, circuitRelayServer } from "@libp2p/circuit-relay-v2";
import { dcutr } from "@libp2p/dcutr";
import type { PeerId } from "@libp2p/interface";
import type { Datastore } from "interface-datastore";
import type { Libp2p } from "./interface.js";

export default async ({ datastore, peerId, psk, addresses, bootstrap: bs, serverMode }: { datastore?: Datastore, peerId?: PeerId, psk?: Uint8Array, addresses?: string[], bootstrap?: string[], serverMode?: boolean }): Promise<Libp2p> => {
	const services: Record<string, unknown> = {};

	if (serverMode === true) {
		services.circuitRelay = circuitRelayServer();
	}

	return await createLibp2p({
		peerId,
		datastore,
		transports: [tcp(), webSockets(), circuitRelayTransport({ discoverRelays: 2 })],
		connectionEncryption: [noise()],
		streamMuxers: [yamux()],
		connectionProtector: psk ? preSharedKey({ psk }) : undefined,

		addresses: {
			listen: addresses ?? [
				"/ip4/127.0.0.1/tcp/0",
				"/ip4/127.0.0.1/tcp/0/ws"
				// "/ip6/::/tcp/0"
			]
		},

		connectionManager: {
			autoDialInterval: 6e3
		},

		services: {
			...services,
			identify: identify(),
			pubsub: gossipsub({ allowPublishToZeroPeers: true }),
			autoNAT: autoNAT(),
			dcutr: dcutr(),
			upnpNAT: uPnPNAT(),

			dht: kadDHT({
				protocol: "/ipfs/kad/1.0.0",
				peerInfoMapper: removePrivateAddressesMapper
			}),

			lanDHT: kadDHT({
				protocol: "/ipfs/lan/kad/1.0.0",
				peerInfoMapper: removePublicAddressesMapper,
				clientMode: false
			})
		},

		peerDiscovery: bs && bs.length > 0 ? [
			bootstrap({
				list: bs ?? []
			})
		] : []
	});
};
