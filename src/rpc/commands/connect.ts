import { multiaddr } from "@multiformats/multiaddr";
import type { Components } from "../utils.js";

export const name = "connect";

export const method = (components: Pick<Components, "libp2p">) => async (params: { address: string }) => {
	const address = multiaddr(params.address);

	await components.libp2p.dial(address);
};
