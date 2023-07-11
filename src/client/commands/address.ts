import { createBuilder, createHandler } from "../utils.js";

export const command = "address";

export const desc = "Get the address of the database.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const address = await argv.client.rpc.request("address", {});

	console.log(address);

	argv.client.close();
});
