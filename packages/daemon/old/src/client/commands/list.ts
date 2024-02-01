import { z } from "zod";
import { createBuilder, createHandler } from "../utils.js";
import { zCID, RevisionStrategies } from "../../daemon/interface.js";

const Item = z.object({
	path: z.string(),
	cid: zCID,
	name: z.string(),
	peers: z.number().int(),
	group: zCID,
	groupName: z.string(),
	encrypted: z.boolean(),
	state: z.string(),
	size: z.number().int(),
	blocks: z.number().int(),
	totalSize: z.number().int(),
	totalBlocks: z.number().int(),
	priority: z.number().int(),
	revisionStrategy: RevisionStrategies,
	meta: z.record(z.unknown()).optional()
});

type Item = z.infer<typeof Item>

const Items = z.array(Item);

type Items = z.infer<typeof Items>

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
};

type JStruct = { [k in string]: JStruct | Item };

const createJSON = (items: Items): JStruct => {
	const struct: JStruct = {};

	for (const item of items) {
		const parts = item.path.split("/").filter(p => p.length !== 0);
		const last = parts.pop();
		let itr = struct;

		for (const part of parts) {
			if (itr[part] == null) {
				itr[part] = {};
			}

			itr = itr[part] as JStruct;
		}

		itr[last ?? ""] = item;
	}

	return struct;
};

const formatPercent = (decimal: number): string => {
	return `${Math.floor(decimal * 1000)  / 10}%`;
};

export const handler = createHandler<typeof builder>(async argv => {
	if (argv.client == null) {
		throw new Error("Failed to connect to daemon.");
	}

	const raw: unknown = await argv.client.rpc.request("list", {});

	const revisionCounter: Record<string, number> = {};

	for (const item of Items.parse(raw)) {
		if (!item.path.startsWith("/v")) {
			continue;
		}

		const parts = item.path.split("/");
		const path = `/${parts.slice(2, parts.length - 2).join("/")}`;

		if (revisionCounter[path] == null) {
			revisionCounter[path] = 0;
		}

		revisionCounter[path] += 1;
	}

	const items = Items.parse(raw).filter(i => i.path.startsWith("/r")).map(i => ({ ...i, path: i.path.slice(2)}));

	items.sort((a, b) => a.path.localeCompare(b.path));

	const completed = {
		blocks: items.reduce((a, b) => a + b.blocks, 0),
		size: items.reduce((a, b) => a + b.size, 0),
		count: items.filter(i => i.state === "COMPLETED").length
	};

	const total = {
		blocks: items.reduce((a, b) => a + b.totalBlocks, 0),
		size: items.reduce((a, b) => a + b.totalSize, 0),
		count: items.length
	};

	if (argv.json === true) {
		return JSON.stringify({
			items,
			completed,
			total
		});
	}

	let header = "Name".padEnd(20);

	header += "Size".padEnd(27);
	header += "Blocks".padEnd(20);
	header += "State".padEnd(15);
	header += "Priority".padEnd(10);
	header += "Revisions".padEnd(10);
	header += "Peers".padEnd(10);
	header += "Group".padEnd(10);
	header += "Encrypted".padEnd(10);
	header += "R-Strategy".padEnd(12);
	header += "CID".padEnd(62);

	console.log(header);

	const printTree = (tree: JStruct, depth: number = 0) => {
		if (depth === 0) {
			console.log("/");
			printTree(tree, 1);
			return;
		}

		for (const [key, subtree] of Object.entries(tree)) {
			let item: Item | null = null;

			try {
				item = Item.parse(subtree);
			} catch (error) {
				// Ignore
			}

			if (item != null) {
				let str = "";

				str += `${"  ".repeat(depth)}${key}`.slice(0, 18).padEnd(20);
				str += `${formatSize(item.size)}/${formatSize(item.totalSize)} (${formatPercent(item.size/item.totalSize)})`.slice(0, 25).padEnd(27);
				str += `${item.blocks}/${item.totalBlocks} (${formatPercent(item.blocks/item.totalBlocks)})`.slice(0, 18).padEnd(20);
				str += `${item.state}`.slice(0, 13).padEnd(15);
				str += `${item.priority}`.slice(0, 8).padEnd(10);
				str += `${revisionCounter[item.path] ?? 0}`.slice(0, 8).padEnd(10);
				str += `${item.peers}`.slice(0, 8).padEnd(10);
				str += `${item.groupName}`.slice(0, 8).padEnd(10);
				str += `${item.encrypted}`.slice(0, 8).padEnd(10);
				str += `${item.revisionStrategy}`.slice(0, 8).padEnd(12);
				str += item.cid.padEnd(62);

				console.log(str);
				continue;
			}

			console.log(`${"  ".repeat(depth)}${key}/`);

			printTree(subtree as JStruct, depth + 1);
		}
	};

	printTree(createJSON(items));

	let footer = "\n";

	footer += "Total".padEnd(15);
	footer += "Size".padEnd(25);
	footer += "Blocks".padEnd(20);
	footer += "\n";
	footer += `${completed.count}/${total.count} (${formatPercent(completed.count/total.count)})`.slice(0, 13).padEnd(15);
	footer += `${formatSize(completed.size)}/${formatSize(total.size)} (${formatPercent(completed.size/total.size)})`.slice(0, 23).padEnd(25);
	footer += `${completed.blocks}/${total.blocks} (${formatPercent(completed.blocks/total.blocks)})`.slice(0, 18).padEnd(20);

	return footer;
});
