import { createBuilder, createHandler } from "../utils.js";

export const command = "add-to-group [group] [cid] [replace]";

export const desc = "Add a item to a group, optionally replacing an item.";

export const builder = createBuilder({
	group: {
		required: true,
		type: "string"
	},

	cid: {
		required: true,
		type: "string"
	},

	replace: {
		required: false,
		type: "string"
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const add = await argv.client.rpc.request("add-to-group", {
		group: argv.group,
		cid: argv.cid,
		replace: argv.replace
	});

	console.log(add);

	argv.client.close();
});
