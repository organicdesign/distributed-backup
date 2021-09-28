const readline = require("readline").createInterface({
	input: process.stdin,
	output: process.stdout
});

const data = require("./data.json");
const Scheduler = require("./scheduler");

const scheduler = new Scheduler(target => {
	console.log("Doing work.", target);
});

// Load the scheduler
for (const file of data)
	scheduler.setTarget(file.path, file.priority);

//scheduler.start();

const x = () => {
	readline.question("", () => {
		scheduler.work.next();
		x();
	});
};

x();
