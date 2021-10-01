const MultiplexingClient = require("./MultiplexingClient");
const PriorityList = require("./PriorityList");
const Scheduler = require("./Scheduler");
const FileIterator = require("./FileIterator");

const multiplexingClient = new MultiplexingClient("unixSocket");
const priorityList = new PriorityList();
const scheduler = new Scheduler(priorityList);

const chunkPromises = [];

// Load the interators into the scheduler.
for (const file of [
	{
		path: "/home/saul/Projects/go-ipfs_v0.9.1_linux-amd64.tar.gz",
		weight: 10
	},
	{
		path: "/home/saul/Projects/test.txt",
		weight: 100
	},
	{
		path: "/home/saul/Projects/rng",
		weight: 11
	}
]) {
		const fileIterator = new FileIterator(file.path);

		chunkPromises.push(fileIterator.chunkify());

		priorityList.add(fileIterator, file.weight);
}

(async () => {
	// Update the scheduler.
	scheduler.update();

	console.log("Proccessing chunks.");
	await Promise.all(chunkPromises);

	// Start transfering the files.
	console.log("Transfering files.");
	for await (const a of multiplexingClient) {
		const fileIterator = scheduler.next();
		const chunk = await fileIterator.next();

		if (chunk.done) {
			console.log(`Completed ${fileIterator.getPath()}`);
			priorityList.remove(fileIterator);
			scheduler.update();
			continue;
		}
		console.log(`${fileIterator.getPath()}:`, chunk);
	}
})();
