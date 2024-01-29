import Path from "path";
import { promisify } from "util";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { toString as uint8ArrayToString } from "uint8arrays";
import Fuse from "@cocalc/fuse-native";
import { createNetClient } from "@organicdesign/net-rpc";
import { stat, convertOpts } from "./utils.js";
import type { FuseOpts } from "./interface.js";

const argv = await yargs(hideBin(process.argv))
	.option({
		socket: {
			alias: "s",
			type: "string",
			default: "/tmp/server.socket"
		}
	})
	.option({
		group: {
			alias: "g",
			type: "string",
			required: true
		}
	})
	.parse();

const net = createNetClient(argv.socket);

const additionalData: { path: string, size: number }[] = [];

const queryGroup = (() => {
	let ts = 0;
	let data: any;

	return async (): Promise<{ path: string, size: number, timestamp: number }[]> => {
		if (Date.now() - ts > 5000) {
			ts = Date.now();
			data = await net.rpc.request("query-group", { group: argv.group });
		}

		return [...data, ...additionalData];
	};
})()

const opts: FuseOpts = {
	async readdir (path: string) {
		try {
			const list = await queryGroup();
			const pathParts = path.split("/").filter(p => !!p);

			const filteredList = list
				.filter(l => l.path.startsWith(Path.join("/r", path)))
				.map(l => ({
					...l,
					path: l.path.slice("/r".length)
				}))
				.map(l => ({
					...l,
					name: l.path.split("/").filter(p => !!p).slice(pathParts.length)[0]
				}))
				.filter(l => !!l.name)

			const names = filteredList.map(l => l.name);
			const stats = filteredList.map(l => {
				let mode: "file" | "dir" | null = null;

				if (l.path === path) {
					mode = "file";
				} else if (l.path.startsWith(path)) {
					mode = "dir";
				} else {
					throw Fuse.ENOENT;
				}

				return stat({
					mode,
					size: l.size,
					atime: new Date(l.timestamp),
					ctime: new Date(l.timestamp),
					mtime: new Date(l.timestamp)
				})
			});

			return { names, stats };
		} catch (error) {
			throw Fuse.ENOENT
		}
	},

	async getattr (path) {
		const list = await queryGroup();
		const file = list.find((l: { path: string }) => l.path === Path.join("/r", path));

		// Exact match is a file.
		if (file != null) {
			return stat({
				mode: "file",
				size: file.size,
				atime: new Date(file.timestamp),
				ctime: new Date(file.timestamp),
				mtime: new Date(file.timestamp)
			});
		}

		// Partial match is a directory.
		if (list.find((l: { path: string }) => l.path.startsWith(Path.join("/r", path)))) {
			return stat({ mode: 'dir', size: 4096 });
		}

		// No match
		throw Fuse.ENOENT;
	},

	async open () {
		return 42; // arbitrary handle
	},

	async release () {},

	async read (path, _, buffer, length, position) {
		const str = await net.rpc.request("read", {
			group: argv.group,
			path: path,
			position: position,
			length: length
		});

		if (str.length !== 0) {
			buffer.write(str);
		}

		return str.length;
	},

	async write (path, _, buffer, length, position) {
		try {
			await net.rpc.request("write", {
				group: argv.group,
				data: uint8ArrayToString(buffer),
				path,
				position,
				length
			});
		} catch (error) {
			console.error(error);
		}

		return length;
	},

	async create (path) {
		// Need to create a null CID at this path or make a cache?...
		additionalData.push({ path: Path.join("/r", path), size: 0 });
		//throw new Error("not implemented");
	},

	async unlink (path: string) {
		await net.rpc.request("delete", {
			group: argv.group,
			path
		});
	},

	async rename (src, dest) {
		const str = await net.rpc.request("read", {
			group: argv.group,
			path: src,
			position: 0,
			length: 99999
		});

		await net.rpc.request("write", {
			group: argv.group,
			dest,
			position: 0,
			length: str.length,
			data: uint8ArrayToString(Buffer.from(str))
		});

		await net.rpc.request("delete", {
			group: argv.group,
			path: src
		});
	}
};

const fuse = new Fuse("/tmp/fuse", convertOpts(opts), { debug: true });

process.on("uncaughtException", async (error) => {
	console.error("PANIC!", error);

	await promisify(fuse.unmount.bind(fuse))();

	process.exit(1);
});

process.on("SIGINT", async () => {
	await promisify(fuse.unmount.bind(fuse))();

	process.exit(1);
});

await promisify(fuse.mount.bind(fuse))();
