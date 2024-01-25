import { promisify } from "util";
import Fuse from "@cocalc/fuse-native";
import { createNetClient, NetClient } from "@organicdesign/net-rpc";
import { stat, convertOpts } from "./utils.js";
import type { FuseOpts } from "./interface.js";

const opts: FuseOpts = {
	async readdir (path: string) {
		if (path === '/') {
			return ['test'];
		}

		throw Fuse.ENOENT
	},

	async getattr (path) {
		if (path === '/') {
			return stat({ mode: 'dir', size: 4096 });
		}

		if (path === '/test') {
			return stat({ mode: 'file', size: 11 });
		}

		throw Fuse.ENOENT;
	},

	async open () {
		return 42;
	},

	async release () {},

	//@ts-ignore
	async read (_, __, buf, len, pos) {
		const str = 'hello world'.slice(pos, pos + len)

		if (str.length !== 0) {
			buf.write(str)
		};

		return str.length
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
