const MultiplexingClient = require("./MultiplexingClient");

const multiplexingClient = new MultiplexingClient("unixSocket");

(async () => {
	for await (const a of multiplexingClient)
		console.log("Do stuff.");
})();
