import { createNetClient } from "@organicdesign/net-rpc";

const { close } = createNetClient("/tmp/server.socket");

process.on("SIGINT", () => {
	close();
	process.exit();
});
