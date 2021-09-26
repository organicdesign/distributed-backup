const maxBandwidth = 0.5; // 50% bandwidth use by this scheduler.

const data = require("./retriever-data.json")
	.filter(file => file.priority >= 0.01)
	.map(file => {
		file.priority *= maxBandwidth;
		return file;
	})
	.sort((a,  b) => b.priority - a.priority);

let counter = 0, serverCounter = 0, currentServer = 0;
setInterval(() => {
	if (counter % Math.round(1 / maxBandwidth) == 0) {
		console.log(data[currentServer].server);

		// Increment serverCounter every time we do a server call.
		serverCounter++;

		// Change server we are doing work for.
		if (serverCounter >= data[currentServer].priority * 100) {
			currentServer = (currentServer + 1) % data.length;
			serverCounter = 0;
		}
	} else
		console.log("Do nothing.");

	// Increment counter
	counter = (counter + 1) % 100;

	if (counter == 0)
		console.log("_____________________________________")
}, 1000);
