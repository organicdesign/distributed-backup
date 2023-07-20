import type { Libp2p } from "@libp2p/interface-libp2p";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { Helia } from "@helia/interface";
import type { Welo } from "../../../welo/dist/src/index.js";
import type { Filestore } from "../filestore/index.js";


export interface Components {
	libp2p: Libp2p<{ pubsub: PubSub }>
	welo: Welo
	blockstore: Filestore
	helia: Helia<Components["libp2p"]>
	encryptionKey: Uint8Array
}
