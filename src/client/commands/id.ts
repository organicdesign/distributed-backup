import { createBuilder, createHandler } from "../utils.js";

export const command = "id";

export const desc = "Get the identity of the instance.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const id = await argv.client.rpc.request("id", {});

	console.log(id);
});
