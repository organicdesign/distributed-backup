import Path from "path";
import { createBuilder, createHandler } from "../utils.js";

export const command = "edit [group] [cid]";

export const desc = "Edit an item in the distributed backup.";

export const builder = createBuilder({
	group: {
		required: true,
		type: "string"
	},

	cid: {
		required: true,
		type: "string"
	},

	priority: {
		alias: "p",
		type: "number"
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const add = await argv.client.rpc.request("edit", {
		group: argv.group,
		cid: argv.cid,
		priority: argv.priority
	});

	console.log(add);

	argv.client.close();
});
