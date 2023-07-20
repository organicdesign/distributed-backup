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
		required: true
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const id = await argv.client.rpc.request("create-group", { name: argv.name, peers: argv.peers });

	console.log(id);

	argv.client.close();
});
