import { createBuilder, createHandler } from "../utils.js";

export const command = "create-group [name] [peers...]";

export const desc = "create a group.";

export const builder = createBuilder({
	name: {
		type: "string",
		required: true
	},

	peers: {
		type: "array",
		default: []
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const address = await argv.client.rpc.request("create-group", { name: argv.name, peers: argv.peers });

	if (argv.json) {
		console.log(JSON.stringify({ address }));
		return;
	}

	console.log(address);
});
