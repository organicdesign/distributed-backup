import { createLibp2p } from "libp2p";
import { yamux } from "@chainsafe/libp2p-yamux";
import { tcp } from "@libp2p/tcp";
import { kadDHT } from "@libp2p/kad-dht";
import { webSockets } from "@libp2p/websockets";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { noise } from "@chainsafe/libp2p-noise";
import { identifyService } from "libp2p/identify";

export default async () => await createLibp2p({
	addresses: {
		listen: [
			"/ip4/127.0.0.1/tcp/0",
			"/ip4/127.0.0.1/tcp/0/ws"
			// "/ip6/::/tcp/0"
		]
	},

	connectionManager: {
		autoDialInterval: 6e3
	},

	transports: [tcp(), webSockets()],
	connectionEncryption: [noise()],
	streamMuxers: [yamux()],
	services: {
		identify: identifyService(),
		pubsub: gossipsub({ allowPublishToZeroPeers: true }),
		dht: kadDHT()
	}
});