import { createBuilder, createHandler } from "../utils.js";

export const command = "export [cid] [path]";

export const desc = "Export files to the filesystem.";

export const builder = createBuilder({
	cid: {
		required: true,
		type: "string"
	},

	path: {
		required: true,
		type: "string"
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const add = await argv.client.rpc.request("export", {
		cid: argv.cid,
		path: argv.path
	});

	console.log(add);

	argv.client.close();
});
