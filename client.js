const net = require("net");

const port = 8080;
const server = "localhost";

const client = net.connect(port, server);

client.on("data", data => {
	console.log(data);
});

client.write("\n");
