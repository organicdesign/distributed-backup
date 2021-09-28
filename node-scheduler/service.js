"use strict";

const net = require("net");

const server = net.createServer();

const BANDWIDTH = 100000; // 100kbs
const BLOCKSIZE = 262158; // Default ipfs block size.

const connections = [];

server.listen("/tmp/unixSocket", () => {
	console.log("now listening");
});

server.on("connection", s => {
	s.on("close", () => {
		// Remove from connections when it closes.
		connections.splice(connections.indexOf(s), 1);
		s.end();
	});

	s.on("data", data => {
		const index = connections.indexOf(s);

		if (index < 0) {
			connections.push(s);
			s.needCount = 1;
		} else
			s.needCount++;
	});
});

let id = 0;
setInterval(() => {
	if (connections.length <= 0)
		return;

	// Increment id first beause it could be out of bound otherwise.
	id = (id + 1) % connections.length;

	connections[id].write("test");
	connections[id].needCount--;

	if (connections[id].needCount <= 0) {
		connections.splice(id, 1);
	}
}, BLOCKSIZE * 1000 / BANDWIDTH);
