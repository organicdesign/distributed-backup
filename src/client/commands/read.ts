import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { createBuilder, createHandler } from "../utils.js";

export const command = "read [group] [path] [position] [length]";

export const desc = "Export files to the filesystem.";

export const builder = createBuilder({
	group: {
		required: true,
		type: "string"
	},

	path: {
		required: true,
		type: "string"
	},

	position: {
		type: "number",
		default: 0
	},

	length: {
		type: "number",
		default: 1024
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const data = await argv.client.rpc.request("read", {
		group: argv.group,
		path: argv.path,
		position: argv.position,
		length: argv.length
	});
	console.log(data)

	if (argv.json === true) {
		return data;
	}

	return data;
});
