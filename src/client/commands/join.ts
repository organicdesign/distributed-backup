import { createBuilder, createHandler } from "../utils.js";

export const command = "join [address]";

export const desc = "Join a group.";

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

	const connect = await argv.client.rpc.request("join", { address: argv.address });

	console.log(connect);

	argv.client.close();
});
