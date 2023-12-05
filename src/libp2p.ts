import { createLibp2p } from "libp2p";
import { yamux } from "@chainsafe/libp2p-yamux";
import { tcp } from "@libp2p/tcp";
import { kadDHT } from "@libp2p/kad-dht";
import { webSockets } from "@libp2p/websockets";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { noise } from "@chainsafe/libp2p-noise";
import { identify } from "@libp2p/identify";
import { bootstrap } from "@libp2p/bootstrap";
import { preSharedKey } from "@libp2p/pnet";
import { uPnPNAT } from "@libp2p/upnp-nat";
import { circuitRelayTransport, circuitRelayServer } from "@libp2p/circuit-relay-v2";
import { dcutr } from "@libp2p/dcutr";
import type { PeerId } from "@libp2p/interface/peer-id";
import type { Datastore } from "interface-datastore";
import type { Libp2p } from "./interface.js";

export default async ({ datastore, peerId, psk, addresses, bootstrap: bs }: { datastore?: Datastore, peerId?: PeerId, psk?: Uint8Array, addresses?: string[], bootstrap?: string[] }): Promise<Libp2p> => await createLibp2p({
	peerId,
	datastore,
	transports: [tcp(), webSockets(), circuitRelayTransport()],
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
		identify: identify(),
		pubsub: gossipsub({ allowPublishToZeroPeers: true }),
		dht: kadDHT(),
		dcutr: dcutr(),
		circuitRelay: circuitRelayServer(),
		upnpNAT: uPnPNAT()
	},

	peerDiscovery: bs && bs.length > 0 ? [
		bootstrap({
			list: bs ?? []
		})
	] : []
});
