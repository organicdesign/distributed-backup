const net = require("net");
const fs = require("fs");
const { execSync } = require("child_process");

const ipfsAsync = require("./classes/ipfs");
const MultiplexingClient = require("./classes/MultiplexingClient");

const multiplexingClient = new MultiplexingClient("unixSocket");

const port = 8080;
const server = "localhost";

const client = net.connect(port, server);

client.on("data", async data => {
	//const ipfs = await ipfsAsync;

	//ipfs.dag.put(data, { format: "dag-pb" });
	fs.writeFileSync("./out", data);
	//const stdout = execSync("cat ./out | ipfs dag put -f protobuf --input-enc protobuf");
	//console.log(stdout);

});

(async () => {
	for await (const a of multiplexingClient)
		client.write("\n");
})();
