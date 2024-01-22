import { createBuilder, createHandler } from "../utils.js";

export const command = "query-group [group]";

export const desc = "Query a group.";

export const builder = createBuilder({
	group: {
		required: true,
		type: "string"
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const query = await argv.client.rpc.request("query-group", { group: argv.group });

	console.log(query);
});
