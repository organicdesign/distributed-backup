const maxSlots = 60;
const maxBandwidth = 0.5; // 50% bandwidth use by this scheduler.

const data = require("./retriever-data.json")
	.filter(file => file.priority * maxSlots >= 1)
	.sort((a,  b) => b.priority - a.priority);

let sum = 0, err = 0;
for (const server of data) {
	const exactCount = server.priority * maxSlots * maxBandwidth + err;
	const count = Math.round(exactCount);

	sum += count;
	err = exactCount - count;

	server.slots = count;
}

let counter = 0;
 setInterval(() => {
	if (counter % Math.round(1 / maxBandwidth) == 0) {
		console.log("Do Something.");
	} else
		console.log("Do nothing.");
	counter++;
}, 1000);
