const net = require("net");
const crypto = require("crypto");

const port = 8080;

const server = new net.createServer();

server.listen(port, function() {
	console.log(`Server listening on localhost:${port}.`);
});

server.on("connection", socket => {
	socket.on("data", chunk => {
		process.stdout.write(chunk.toString());

		const shasum = crypto.createHash("sha1");
		shasum.update(chunk.toString());

		socket.write(shasum.digest("hex"));
	});

	socket.on("end", () => {
		console.log("Closing connection with the client");
	});

	socket.on("error", err => {
		console.log(`Error: ${err}`);
	});
});
