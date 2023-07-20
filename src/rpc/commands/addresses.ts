import type { Components } from "../utils.js";

export const name = "addresses";

export const method = (components: Components) => async () => {
	return components.libp2p.getMultiaddrs().map(a => a.toString());
};
