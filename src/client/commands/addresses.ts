import { createBuilder, createHandler } from "../utils.js";

export const command = "addresses";

export const desc = "Get the address of the database.";

export const builder = createBuilder({
	type: {
		type: "string",
		default: "libp2p",
		choices: ["libp2p", "welo"] as const
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const addresses = await argv.client.rpc.request("address", { type: argv.type });

	console.log(addresses);

	argv.client.close();
});
