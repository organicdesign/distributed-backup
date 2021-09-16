const net = require("net");
const { execSync } = require("child_process");
const crypto = require("crypto");

const client = new net.Socket();

let sent = null;
let position = 0;

const sendData = () => {
	const stdout = execSync(`../read ./package.json 100 ${position}`);

	if (stdout.length === 0)
		client.destroy();

	client.write(stdout);

	const shasum = crypto.createHash("sha1");
	shasum.update(stdout.toString());
	sent = shasum.digest("hex");
};

client.connect(8080, "127.0.0.1", () => {
	console.log("Connected");

	sendData();
});

client.on("data", data => {
	if (sent === data.toString()) {
		console.log("Got correct ack!");
		position++;
		sendData();
	} else {
		console.log("Wrong ack!");
	}
});

client.on("close", () => {
	console.log("Connection closed");
});
