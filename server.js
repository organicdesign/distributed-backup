const net = require("net");

const port = 8080;
const host = "localhost";

const server = new net.Server();

server.listen(port, host, () => {
	console.log(`Server listening on ${port}`);
});

server.on("connection", s => {
	s.on("data", data => {
		// Do something.
		console.log("Got data.");
	});
});
