import { createBuilder, createHandler } from "../utils.js";

export const command = "query-pins";

export const desc = "Query all pins.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const query = await argv.client.rpc.request("query-pins", {});

	console.log(query);

	argv.client.close();
});
