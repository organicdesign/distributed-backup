import Path from "path";
import { createBuilder, createHandler } from "../utils.js";

export const command = "add [group] [path] [remotePath]";

export const desc = "Add a file or directory to the distributed backup.";

export const builder = createBuilder({
	group: {
		required: true,
		type: "string"
	},

	path: {
		required: true,
		type: "string"
	},

	remotePath: {
		required: false,
		type: "string",
		default: "/"
	},

	onlyHash: {
		alias: "n",
		default: false,
		type: "boolean"
	},

	encrypt: {
		default: false,
		type: "boolean"
	},

	autoUpdate: {
		default: false,
		type: "boolean"
	},

	versionCount: {
		type: "number"
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

	const pathParts = argv.path.split("/");
	const name = pathParts[pathParts.length - 1];

	const add = await argv.client.rpc.request("add", {
		group: argv.group,
		path: Path.resolve(argv.path),
		remotePath: Path.join(argv.remotePath, name),
		onlyHash: argv.onlyHash,
		encrypt: argv.encrypt,
		autoUpdate: argv.autoUpdate,
		versionCount: argv.versionCount,
		priority: argv.priority
	});

	console.log(add);

	argv.client.close();
});
