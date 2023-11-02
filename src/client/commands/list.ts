import { createBuilder, createHandler } from "../utils.js";

export const command = "list";

export const desc = "List all items.";

export const builder = createBuilder({});

const formatSize = (size: number): string => {
	if (size > Math.pow(1000, 3)) {
		return `${Math.floor((size * 10) / Math.pow(1000, 3)) / 10} GB`;
	}

	if (size > Math.pow(1000, 2)) {
		return `${Math.floor((size * 10) / Math.pow(1000, 2)) / 10} MB`;
	}

	if (size > Math.pow(1000, 1)) {
		return `${Math.floor((size * 10) / Math.pow(1000, 1)) / 10} KB`;
	}

	if (size > Math.pow(1000, 0)) {
		return `${Math.floor((size * 10) / Math.pow(1000, 0)) / 10} B`;
	}

	return `${size} B`;
}

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
		state: string,
		size: number,
		blocks: number,
		totalSize: number,
		totalBlocks: number
	}[] = await argv.client.rpc.request("list", {});

	let header = "Name".padEnd(10);

	header += "Size".padEnd(15);
	header += "Blocks".padEnd(15);
	header += "State".padEnd(15);
	header += "Revisions".padEnd(10);
	header += "Peers".padEnd(10);
	header += "Group".padEnd(10);
	header += "Encrypted".padEnd(10);
	header += "CID".padEnd(62);

	console.log(header);

	for (const item of items) {
		let str = "";

		str += item.name.slice(0, 8).padEnd(10);
		str += `${formatSize(item.size)}/${formatSize(item.totalSize)}`.slice(0, 13).padEnd(15);
		str += `${item.blocks}/${item.totalBlocks}`.slice(0, 13).padEnd(15);
		str += `${item.state}`.slice(0, 13).padEnd(15);
		str += `${item.revisions}`.slice(0, 8).padEnd(10);
		str += `${item.peers}`.slice(0, 8).padEnd(10);
		str += `${item.groupName}`.slice(0, 8).padEnd(10);
		str += `${item.encrypted}`.slice(0, 8).padEnd(10);
		str += item.cid.padEnd(62);

		console.log(str);
	}

	argv.client.close();
});
