const net = require("net");
const { execSync } = require("child_process");
const crypto = require("crypto");

const client = new net.Socket();

let sent = null;
let position = 0;

client.connect(8080, "127.0.0.1", () => {
	console.log("Connected");
	const stdout = execSync(`../read ./package.json 100 ${position}`);

	client.write(stdout);

	const shasum = crypto.createHash("sha1");
	shasum.update(stdout.toString());
	sent = shasum.digest("hex");
});

client.on("data", data => {
	if (sent === data.toString())
		console.log("Got correct ack!");
	else
		console.log("Wrong ack!");
});

client.on("close", () => {
	console.log("Connection closed");
});
