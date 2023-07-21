import { createBuilder, createHandler } from "../utils.js";

export const command = "list-groups";

export const desc = "List joined groups.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const groups = await argv.client.rpc.request("list-groups", {});

	console.log(groups);

	argv.client.close();
});
