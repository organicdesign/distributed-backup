"use strict";

const net = require("net");

const client = net.connect("/tmp/unixSocket");

function* transferFile () {
	for (;;) {
		// Do work
		console.log("transfering file.")
		yield;

		// Once complete:
		break;
	}
};

const files = [];

const transferAFile = () => {
	files.push(transferFile());
	client.write("\n");
};

let i = 0;
client.on("data", data => {
	if (files.length <= 0)
		return;

	i = (i + 1) % files.length;

	if (files[i].next().done)
		files.splice(i, 1);
	else
		client.write("\n");
});

transferAFile();
transferAFile();
transferAFile();
