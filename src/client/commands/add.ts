import { createBuilder, createHandler } from "../utils.js";

export const command = "add [path]";

export const desc = "Create an empty repo";

export const builder = createBuilder({
	path: {
		required: true,
		type: "string"
	},
	onlyHash: {
		alias: "n",
		default: false,
		type: "boolean"
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const add = await argv.client.rpc.request("add", { path: argv.path, onlyHash: argv.onlyHash });

	console.log(add);

	argv.client.close();
});
