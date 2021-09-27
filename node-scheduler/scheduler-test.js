const Scheduler = require("./scheduler");

const scheduler = new Scheduler(
	target => {
		console.log("Doing work.", target);
	},
	() => {
		console.log("Sleeping");
	}
);

scheduler.setTarget("test-1", 10);
scheduler.setTarget("test-2", 100);
scheduler.setTarget("test-3", 31);


scheduler.setBandwidth(1 * 1000 * 1000)
scheduler.setBandwidthUsage(0.1)
scheduler.start();
scheduler.stop();

scheduler.start();

scheduler.setTarget("test-4", 100);
