import { createNetServer } from "@organicdesign/net-rpc";

const { rpc, close } = await createNetServer("/tmp/server.socket");

process.on("SIGINT", async () => {
	await close();
	process.exit();
});
