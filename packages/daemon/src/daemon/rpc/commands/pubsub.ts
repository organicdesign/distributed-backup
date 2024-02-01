import type { Components } from "../../interface.js";

export const name = "pubsub";

export const method = (components: Components) => async () => {
	return components.libp2p.services.pubsub.getTopics();
};
