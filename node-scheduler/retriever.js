const maxBandwidth = 0.12; // 50% bandwidth use by this scheduler.

// Obtain and sort the data.
const data = require("./retriever-data.json")
	.filter(file => file.priority >= 0.01)
	.map(file => {
		file.priority *= maxBandwidth;
		return file;
	})
	.sort((a,  b) => b.priority - a.priority);

const calculateIntervals = () => {
	// We need a greatest common denominator function for the next calculations.
	const gcd = (a, b) => {
		a = Math.abs(a);
		b = Math.abs(b);

		if (b > a)
			[a, b] = [b, a];

		while (true) {
			if (b == 0)
				return a;

			a %= b;

			if (a == 0)
				return b;

			b %= a;
		}
	};

	// Convert the bandwidth into slots out of 100
	const bandwidthAsSlots = maxBandwidth * 100;

	// Work out what number we need to divide by to reduce the slots value.
	const gcdWork = gcd(bandwidthAsSlots, 100 - bandwidthAsSlots);

	// Calculate the number of slots of work and sleep.
	const slotsOfWork = bandwidthAsSlots / gcdWork;
	const slotsOfSleep = (100 - bandwidthAsSlots) / gcdWork;

	// Predefine the return values so if left unchanged they have the default.
	let work = 1, sleep = 1, rWork = 0, rSleep = 0;

	// We need to check if we will have a remainder of work or sleep.
	if (slotsOfWork > slotsOfSleep) {
		// Calculate the remainder of work.
		rWork = slotsOfWork % slotsOfSleep;

		// Use the remainder to reduce the work value as low as possible.
		const rGcdWork = gcd(slotsOfWork - rWork, slotsOfSleep);

		// We only need to work out how much work needs to be done for 1 sleep.
		work = (slotsOfWork - rWork) / rGcdWork;
	} else {
		// Calculate the remainder of sleep.
		rSleep = slotsOfSleep % slotsOfWork;

		// Use the remainder to reduce the sleep value as low as possible.
		const rGcdWork = gcd(slotsOfWork, slotsOfSleep - rSleep);

		// We only need to work out how much sleep needs to be done for 1 work.
		sleep = (slotsOfSleep - rSleep) / rGcdWork;
	}

	return {
		work,
		sleep,
		rWork,
		rSleep
	};
};

console.log(calculateIntervals());

// Set interval.
let counter = 0, serverCounter = 0, currentServer = 0;
setInterval(() => {
	if (counter < slotsOfWork) {
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
	counter = (counter + 1) % (slotsOfWork + slotsOfSleep);

	if (counter == 0)
		console.log("_____________________________________")
}, 1000);
