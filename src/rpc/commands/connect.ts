import { multiaddr } from "@multiformats/multiaddr";
import type { Components } from "../../interface.js";

export const name = "connect";

export const method = (components: Components) => async (params: { address: string }) => {
	const address = multiaddr(params.address);

	await components.libp2p.dial(address);
};
