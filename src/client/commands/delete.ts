import { createBuilder, createHandler } from "../utils.js";

export const command = "delete [group] [cid]";

export const desc = "Delete an item from a group.";

export const builder = createBuilder({
	group: {
		required: true,
		type: "string"
	},

	cid: {
		required: true,
		type: "string"
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const del = await argv.client.rpc.request("delete", {
		group: argv.group,
		cid: argv.cid
	});

	console.log(del);

	argv.client.close();
});
