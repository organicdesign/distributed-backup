import { createBuilder, createHandler } from "../utils.js";

export const command = "connect [address]";

export const desc = "Connect to a peer.";

export const builder = createBuilder({
	address: {
		type: "string",
		required: true
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const connect = await argv.client.rpc.request("connect", { address: argv.address });

	console.log(connect);

	argv.client.close();
});
