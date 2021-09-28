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
	connections.push(s);

	s.on("close", () => {
		// Remove from connections when it closes.
		connections.splice(connections.indexOf(s), 1);
		s.end();
	});
});

let id = 0;
setInterval(() => {
	if (connections.length <= 0)
		return;

	// Increment id first beause it could be out of bound otherwise.
	id = (id + 1) % connections.length;

	connections[id].write("test");
}, BLOCKSIZE * 1000 / BANDWIDTH);
