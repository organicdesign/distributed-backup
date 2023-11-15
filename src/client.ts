import { createNetClient } from "@organicdesign/net-rpc";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import commands from "./client/index.js";
import { createMiddleware } from "./client/utils.js";

await yargs(hideBin(process.argv))
	.command(commands)
	.demandCommand()
	.middleware(createMiddleware(argv => {
		argv.client = createNetClient(argv.socket ?? "/tmp/server.socket");

		process.on("SIGINT", () => {
			argv.client?.close();
			process.exit(1);
		});
	}))
	.parse();
