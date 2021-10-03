const MultiplexingClient = require("./classes/MultiplexingClient");
const PriorityList = require("./classes/PriorityList");
const Scheduler = require("./classes/Scheduler");
const FileIterator = require("./classes/FileIterator");

const multiplexingClient = new MultiplexingClient("unixSocket");
const priorityList = new PriorityList();
const scheduler = new Scheduler(priorityList);

const chunkPromises = [];

// Load the iterators into the scheduler.
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

		// Add each chunk promise to a list to ensure completion later.
		chunkPromises.push(fileIterator.chunkify());

		priorityList.add(fileIterator, file.weight);
}

(async () => {
	// Update the scheduler.
	scheduler.update();

	// Ensure all chunks are processed.
	console.log("Proccessing chunks.");
	await Promise.all(chunkPromises);

	// Start transfering the files.
	console.log("Transfering files.");
	for await (const a of multiplexingClient) {
		const fileIterator = scheduler.next();
		const chunk = await fileIterator.next();

		if (chunk.done) {
			// Remove the file from the list if it completes.
			console.log(`Completed ${fileIterator.getPath()}`);
			priorityList.remove(fileIterator);
			scheduler.update();
			continue;
		}

		// Transfer the chunk.
		console.log(`${fileIterator.getPath()}:`, chunk);
	}
})();
