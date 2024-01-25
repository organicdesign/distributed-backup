import Path from "path";
import { promisify } from "util";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
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

const opts: FuseOpts = {
	async readdir (path: string) {
		try {
			const list = await net.rpc.request("list", {});
			const pathParts = path.split("/").filter(p => !!p);

			const data = list
				.map((l: { path: string }) => l.path)
				.filter((p: string) => p.startsWith("/r"))
				.map((p: string) => p.slice("/r".length))
				.filter((p: string) => p.startsWith(path))
				.map((p: string) => p.split("/").filter(p => !!p))
				.map((p: string) => p.slice(pathParts.length))
				.map((p: string) => p[0])
				.filter((p: string) => !!p);

			return data;
		} catch (error) {
			throw Fuse.ENOENT
		}
	},

	async getattr (path) {
		const list = await net.rpc.request("list", {});
		const file = list.find((l: { path: string }) => l.path === Path.join("/r", path));

		// Exact match is a file.
		if (file != null) {
			return stat({ mode: 'file', size: file.size });
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
