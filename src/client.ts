import { createNetClient } from "@organicdesign/net-rpc";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import commands from "./client/commands/index.js";
import { createMiddleware } from "./client/utils.js";

await yargs(hideBin(process.argv))
	.command(commands)
	.demandCommand()
	.middleware(createMiddleware(argv => {
		argv.client = createNetClient(argv.socket);
	}))
	.parse();
/*
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

const id = await rpc.request("id", {});

console.log("id", id);

const address = await rpc.request("address", {});

console.log("address", address);
*/
