const net = require("net");

const MultiplexingClient = require("./classes/MultiplexingClient");

const multiplexingClient = new MultiplexingClient("unixSocket");

const port = 8080;
const server = "localhost";

const client = net.connect(port, server);

client.on("data", data => {
	console.log(data.toString());
});

(async () => {
	for await (const a of multiplexingClient)
		client.write("\n");
})();
