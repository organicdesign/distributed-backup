import { createBuilder, createHandler } from "../utils.js";

export const command = "addresses";

export const desc = "Get the address of the peer.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const addresses = await argv.client.rpc.request("addresses", {});

	if (argv.json) {
		console.log(JSON.stringify(addresses));
		argv.client.close();
		return;
	}

	console.log(addresses);

	argv.client.close();
});
