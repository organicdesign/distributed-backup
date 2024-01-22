import { createBuilder, createHandler } from "../utils.js";

export const command = "connections";

export const desc = "Get the connections of the peer.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const connections = await argv.client.rpc.request("connections", {});

	if (argv.json) {
		console.log(JSON.stringify(connections));
		argv.client.close();
		return;
	}

	console.log(connections);
});
