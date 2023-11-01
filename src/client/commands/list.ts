import { createBuilder, createHandler } from "../utils.js";

export const command = "list";

export const desc = "List all items.";

export const builder = createBuilder({});

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const items: {
		cid: string,
		name: string,
		revisions: number,
		peers: number,
		group: string,
		groupName: string,
		encrypted: boolean,
		size: number
	}[] = await argv.client.rpc.request("list", {});

	let header = "Name".padEnd(10);

	header += "Size".padEnd(10);
	header += "Revisions".padEnd(10);
	header += "Peers".padEnd(10);
	header += "Group".padEnd(10);
	header += "Encrypted".padEnd(10);
	header += "CID".padEnd(62);

	console.log(header);

	for (const item of items) {
		let str = "";

		let niceSize = `${item.size} b`;

		if (item.size > Math.pow(1000, 0)) {
			niceSize = `${Math.floor((item.size * 10) / Math.pow(1000, 0)) / 10} B`;
		}

		if (item.size > Math.pow(1000, 1)) {
			niceSize = `${Math.floor((item.size * 10) / Math.pow(1000, 1)) / 10} KB`;
		}

		if (item.size > Math.pow(1000, 2)) {
			niceSize = `${Math.floor((item.size * 10) / Math.pow(1000, 2)) / 10} MB`;
		}

		if (item.size > Math.pow(1000, 3)) {
			niceSize = `${Math.floor((item.size * 10) / Math.pow(1000, 3)) / 10} GB`;
		}

		str += item.name.slice(0, 8).padEnd(10);
		str += `${niceSize}`.slice(0, 8).padEnd(10);
		str += `${item.revisions}`.slice(0, 8).padEnd(10);
		str += `${item.peers}`.slice(0, 8).padEnd(10);
		str += `${item.groupName}`.slice(0, 8).padEnd(10);
		str += `${item.encrypted}`.slice(0, 8).padEnd(10);
		str += item.cid.padEnd(62);

		console.log(str);
	}

	argv.client.close();
});
