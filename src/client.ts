import { createNetClient } from "@organicdesign/net-rpc";
import Path from "path";
import { srcPath } from "./utils.js";

const { close, rpc } = createNetClient("/tmp/server.socket");

process.on("SIGINT", () => {
	close();
	process.exit();
});

const path = Path.join(srcPath, "src");

console.log("adding:");
let start = performance.now();
const cid = await rpc.request("add", { path });
console.log("added", performance.now() - start, cid);

console.log("adding:");
start = performance.now();
const cid2 = await rpc.request("add", { path, hashonly: true });
console.log("added", performance.now() - start, cid2);

const query = await rpc.request("query", {});

console.log("query", query);
