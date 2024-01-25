import { promisify } from "util";
import Fuse from "@cocalc/fuse-native";
import { createNetClient, NetClient } from "@organicdesign/net-rpc";

interface Stat {
	mtime: Date
	atime: Date
	ctime: Date
	size: number
	mode: number
	uid: number
	gid: number
	nlink: number
	dev: number
	blksize: number
	blocks: number
	ino: number
	rdev: number
}

interface FuseCBOpts {
	readdir (path: string, cb: (err: number, names: string[], stats?: Fuse.Stats[]) => void): void
	getattr (path: string, cb: (err: number, stats?: Fuse.Stats) => void): void
	open (path: string, mode: number, cb: (err: number, fd: number) => void): void
	release (path: string, fd: number, cb: (err: number) => void): void
	read (path: string, fd: number, bufffer: Buffer, length: number, position: number, cb: (bytesRead: number) => void): void
}

interface FuseOpts {
	readdir (path: string): Promise<string[]>
	getattr (path: string): Promise<Fuse.Stats>
	open (path: string, mode: number): Promise<number>
	release (path: string, fd: number): Promise<void>
	read (path: string, fd: number, bufffer: Buffer, length: number, position: number): Promise<void>
}

const stat = (st: {
	mtime?: Date
	atime?: Date
	ctime?: Date
	size?: number,
	mode: string | number,
	uid?: number
	gid?: number
}): Stat => {
	return {
		mtime: st.mtime || new Date(),
		atime: st.atime || new Date(),
		ctime: st.ctime || new Date(),
		size: st.size ?? 0,
		mode: st.mode === 'dir' ? 16877 : (st.mode === 'file' ? 33188 : (st.mode === 'link' ? 41453 : 0)),
		uid: st.uid ?? process.getuid?.() ?? 0,
		gid: st.gid ?? process.getgid?.() ?? 0,
		nlink: 0,
		dev: 0,
		blksize: 0,
		blocks: 0,
		ino: 0,
		rdev: 0
	}
};

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

const toCallbacks = (opts: FuseOpts): FuseCBOpts => {
	const out: Partial<FuseCBOpts> = {};

	for (const key of Object.keys(opts)) {
		out[key] = function () {
			const args = [...arguments]
			const cb = args.pop();

			opts[key].apply(fuse, args).then(function (r: unknown) {
				cb(0, r);
			}).catch((e: number) => cb(e));
		}
	}

	return out as FuseCBOpts;
};

const fuse = new Fuse("/tmp/fuse", toCallbacks(opts), { debug: true });

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
