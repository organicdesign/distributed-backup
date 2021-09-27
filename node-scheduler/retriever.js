const maxBandwidth = 0.5; // 50% bandwidth use by this scheduler.

// Obtain and sort the data.
const data = require("./retriever-data.json")
	.filter(file => file.priority >= 0.01)
	.sort((a,  b) => b.priority - a.priority);

// We want to distribute the data into an array.
const buffer = new Array(maxBandwidth * 100).fill(null);

// Fill buffer with the data distributed.
let err = 0;
for (const server of data) {
	const itemCount = server.priority * 100 * maxBandwidth;
	const distance = buffer.length / itemCount + err;
	const roundedDistance = Math.round(distance);

	let pos = 0;
	for (let i = 0; i < itemCount; i++) {
		pos += roundedDistance % buffer.length;

		for (let y = 0; true; y++) {
			let insertAt = (pos + y) % buffer.length;

			if (buffer[insertAt] === null) {
				buffer[insertAt] = server.server;
				break;
			}
		}
	}

	err += roundedDistance - distance;
}

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
		rSleep,
		total: slotsOfWork + slotsOfSleep,
	};
};

const times = calculateIntervals();

// Set interval.
let counter = 0, currItrCounter = 0, serverCounter = 0, currentServer = 0;
setInterval(() => {
	const doWork = () => {
		console.log(buffer[serverCounter]);

		// Increment serverCounter every time we do a server call.
		serverCounter = (serverCounter + 1) % buffer.length;
	};

	if (counter < times.rWork) {
		doWork();
	} else if (counter < times.rSleep) {
		console.log("Remainder sleep");
	} else {
		if (currItrCounter < times.work) {
			doWork();
		} else {
			console.log("Do nothing.");
		}

		currItrCounter++;

		if (currItrCounter >= times.work + times.sleep)
			currItrCounter = 0;
	}

	// Increment counter
	counter = (counter + 1) % times.total;
}, 1000);
