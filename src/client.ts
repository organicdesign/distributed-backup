import { createNetClient } from "@organicdesign/net-rpc";
import Path from "path";
import { fileURLToPath } from "url";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

const { close, rpc } = createNetClient("/tmp/server.socket");

process.on("SIGINT", () => {
	close();
	process.exit();
});

console.log("adding:");
const cid = await rpc.request("add", { path: __dirname });
console.log("added", cid);

const query = await rpc.request("query", {});

console.log("query", query);
