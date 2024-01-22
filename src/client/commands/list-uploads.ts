import { createBuilder, createHandler } from "../utils.js";

export const command = "list-uploads";

export const desc = "List uploaded items.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const uploads = await argv.client.rpc.request("list-uploads", {});

	return uploads;
});
