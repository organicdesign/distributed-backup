import { createBuilder, createHandler } from "../utils.js";

export const command = "list-groups";

export const desc = "List joined groups.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const groups: { cid: string, name: string, count: number, peers: number }[] = await argv.client.rpc.request("list-groups", {});

	console.log(`${"Name".padEnd(10)}${"Items".padEnd(10)}${"Peers".padEnd(10)}${"CID".padEnd(62)}`);

	for (const group of groups) {
		let str = "";

		str += group.name.slice(0, 8).padEnd(10);
		str += `${group.count}`.slice(0, 8).padEnd(10);
		str += `${group.peers}`.slice(0, 8).padEnd(10);
		str += group.cid.padEnd(62);

		console.log(str);
	}

	argv.client.close();
});
