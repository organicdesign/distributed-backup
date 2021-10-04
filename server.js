const net = require("net");

const PriorityList = require("./classes/PriorityList");
const FileIterator = require("./classes/FileIterator");
const Scheduler = require("./classes/Scheduler");
const data = require("./data.json");

const port = 8080;
const host = "localhost";

// Load data
const priorityList = new PriorityList();
const scheduler = new Scheduler(priorityList);
const chunkPromises = [];

for (const file of data) {
		const fileIterator = new FileIterator(file.path);

		// Add each chunk promise to a list to ensure completion later.
		chunkPromises.push(fileIterator.chunkify());

		priorityList.add(fileIterator, file.weight);
}

// Setup server
const setupServer = () => {
	const server = new net.Server();

	server.listen(port, host, () => {
		console.log(`Server listening on ${port}`);
	});

	server.on("connection", s => {
		s.on("data", data => {
			// Do something.
			console.log("Got data.");
		});
	});
};


//
(async () => {
	// Ensure all chunks are processed.
	console.log("Proccessing chunks.");
	await Promise.all(chunkPromises);

	// Update the scheduler.
	scheduler.update();


	// Setup server
	const server = new net.Server();

	server.listen(port, host, () => {
		console.log(`Server listening on ${port}`);
	});

	server.on("connection", s => {
		s.on("data", async data => {
			const sendData = async () => {
				const fileIterator = scheduler.next();

				if (!fileIterator)
					process.exit();

				const chunk = await fileIterator.next();

				if (chunk.done) {
					// Remove the file from the list if it completes.
					console.log(`Completed ${fileIterator.getPath()}`);
					priorityList.remove(fileIterator);
					scheduler.update();
					return sendData();
				}

				s.write(chunk.value.content.toString());
			}

			sendData();
		});
	});
})();
