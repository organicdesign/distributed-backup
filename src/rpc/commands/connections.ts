import type { Components } from "../utils.js";

export const name = "connections";

export const method = (components: Components) => async () => {
	return components.libp2p.getConnections().map(c => c.toString());
};
