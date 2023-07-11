import { createBuilder, createHandler } from "../utils.js";

export const command = "query";

export const desc = "Query the database";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const query = await argv.client.rpc.request("query", {});

	console.log(query);

	argv.client.close();
});
