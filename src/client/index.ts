import { createNetClient, NetClient } from "@organicdesign/net-rpc";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import commands from "./commands.js";
import { createMiddleware } from "./utils.js";

const argv = await yargs(hideBin(process.argv))
	.command(commands)
	.demandCommand()
	.middleware(createMiddleware(argv => {
		const client = createNetClient(argv.socket ?? "/tmp/server.socket");

		argv.client = client;

		process.on("SIGINT", () => {
			client.close();
			process.exit(1);
		});
	}))
	.parse();

(argv["client"] as NetClient).close();
