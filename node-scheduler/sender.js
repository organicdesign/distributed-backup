const data = require("./data.json").sort((a,  b) => b.priority - a.priority);

const buffer = [];
const size = 60;

let priorityCounter = 0;
for (const file of data) {
	if (buffer.length > size)
		break;

	const slots = file.priority * size / priorityCounter;

	if (slots < 1)
		break;

	buffer.push(file);

	priorityCounter += file.priority;
}

let sum = 0, err = 0;
for (const file of buffer) {
	const exactCount = file.priority * size / priorityCounter + err;
	const count = Math.round(exactCount);

	sum += count;
	err = exactCount - count;

	console.log(`${file.path}: ${count}`);
}
