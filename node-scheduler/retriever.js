const maxSlots = 60;
const maxBandwidth = 0.5; // 50% bandwidth use by this scheduler.

const data = require("./retriever-data.json")
	.filter(file => file.priority * maxSlots >= 1)
	.sort((a,  b) => b.priority - a.priority);

console.log(data);
