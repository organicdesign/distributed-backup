import { isMainThread, parentPort } from "worker_threads";
import * as dagPb from "@ipld/dag-pb";
import { UnixFS, UnixFSOptions } from "ipfs-unixfs"
import { JSONRPCServer } from "json-rpc-2.0";

const server = new JSONRPCServer();

if (isMainThread || parentPort == null) {
	throw new Error("Cannot run on main thread.");
}

server.addMethod("hash", (opts: UnixFSOptions) => {
	const unixfs = new UnixFS(opts)

	const block = dagPb.encode({
		Data: unixfs.marshal(),
		Links: []
	});

	return { block, unixfs };
});

parentPort.on("message", async data => {
	const res = await server.receive(data);

	parentPort?.postMessage(res);
});
