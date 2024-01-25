import { promisify } from "util";
import Fuse from "@cocalc/fuse-native";
import { createNetClient, NetClient } from "@organicdesign/net-rpc";

const stat = (st: {
	mtime?: Date
	atime?: Date
	ctime?: Date
	size?: number,
	mode: string | number,
	uid?: number
	gid?: number
}) => {
	return {
		mtime: st.mtime || new Date(),
		atime: st.atime || new Date(),
		ctime: st.ctime || new Date(),
		size: st.size !== undefined ? st.size : 0,
		mode: st.mode === 'dir' ? 16877 : (st.mode === 'file' ? 33188 : (st.mode === 'link' ? 41453 : 0)),
		uid: st.uid !== undefined ? st.uid : process.getuid?.() ?? 0,
		gid: st.gid !== undefined ? st.gid : process.getgid?.() ?? 0,
		nlink: 0,
		dev: 0,
		blksize: 0,
		blocks: 0,
		ino: 0,
		rdev: 0
	}
};

const opts = {
	async readdir (path: string) {
		if (path === '/') return ['test'];
		throw Fuse.ENOENT
	},

	async getattr (path) {
		if (path === '/') return stat({ mode: 'dir', size: 4096 });
		if (path === '/test') return stat({ mode: 'file', size: 11 });
		throw Fuse.ENOENT;
	},

	async open (path, flags, cb) {
		return 42
	},

	async release (path, fd, cb) {
		return;
	},

	async read (path, fd, buf, len, pos, cb) {
		var str = 'hello world'.slice(pos, pos + len)
		if (!str) return;
		buf.write(str)
		return str.length
	}
};

const out = {};

for (const key of Object.keys(opts)) {
	out[key] = function () {
		const args = [...arguments]
		const cb = args.pop();

		opts[key].apply(fuse, args).then(r => cb(0, r)).catch(e => cb(e));
	}
}

const fuse = new Fuse("/tmp/fuse", out, { debug: true });

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
