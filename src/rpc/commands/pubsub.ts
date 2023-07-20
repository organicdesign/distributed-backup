import type { Components } from "../utils.js";

export const name = "pubsub";

export const method = (components: Components) => async () => {
	return components.libp2p.services.pubsub.getTopics();
};
