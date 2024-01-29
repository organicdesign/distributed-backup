import type Fuse from "@cocalc/fuse-native";
import type { FuseOpts } from "./interface.js";

export const stat = (st: {
	mtime?: Date
	atime?: Date
	ctime?: Date
	size?: number,
	mode: string | number,
	uid?: number
	gid?: number
}): Fuse.Stats => {
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

export const convertOpts = (opts: FuseOpts): Fuse.OPERATIONS => {
	const out: Partial<Fuse.OPERATIONS> = {};

	for (const key of Object.keys(opts)) {
		out[key] = function () {
			const args = [...arguments]
			const cb = args.pop();

			opts[key].apply(null, args).then(function (r: unknown) {
				if (key === "read") {
					cb(r);
					return;
				}

				if (key === "write") {
					cb(r);
					return;
				}

				if (key === "readdir") {
					cb(0, (r as any).names, (r as any).stats)
				}

				cb(0, r);
			}).catch((e: number) => cb(e));
		}
	}

	return out as Fuse.OPERATIONS;
};
