import { createBuilder, createHandler } from "../utils.js";

export const command = "join-group [group]";

export const desc = "Join a group.";

export const builder = createBuilder({
	group: {
		type: "string",
		required: true
	}
});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const connect = await argv.client.rpc.request("join-group", { group: argv.group });

	if (argv.json === true) {
		return JSON.stringify({
			success: true,
			group: connect
		});
	}

	return connect;
});
