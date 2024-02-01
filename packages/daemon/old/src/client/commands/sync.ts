import { createBuilder, createHandler } from "../utils.js";

export const command = "sync";

export const desc = "Sync all databases with connected peers.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const result = await argv.client.rpc.request("sync", {});

	return result;
});
