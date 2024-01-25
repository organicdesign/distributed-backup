import type Fuse from "@cocalc/fuse-native";

export interface FuseCBOpts {
	readdir (path: string, cb: (err: number, names: string[], stats?: Fuse.Stats[]) => void): void
	getattr (path: string, cb: (err: number, stats?: Fuse.Stats) => void): void
	open (path: string, mode: number, cb: (err: number, fd: number) => void): void
	release (path: string, fd: number, cb: (err: number) => void): void
	read (path: string, fd: number, buffer: Buffer, length: number, position: number, cb: (bytesRead?: number) => void): void
}

export interface FuseOpts {
	readdir (path: string): Promise<string[]>
	getattr (path: string): Promise<Fuse.Stats>
	open (path: string, mode: number): Promise<number>
	release (path: string, fd: number): Promise<void>
	read (path: string, fd: number, bufffer: Buffer, length: number, position: number): Promise<number | void>
}
