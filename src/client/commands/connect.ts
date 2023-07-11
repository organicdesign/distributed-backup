import { createBuilder, createHandler } from "../utils.js";

export const command = "connect [address]";

export const desc = "Connect to a database.";

export const builder = createBuilder({
	address: {
		type: "string",
		required: true
	},
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

	const connect = await argv.client.rpc.request("connect", { address: argv.address, type: argv.type });

	console.log(connect);

	argv.client.close();
});
