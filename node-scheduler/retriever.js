const rawData = require("./retriever-data.json");

/**
 * Calculates the greatest common divider of two numbers.
 *
 * @param a The first number to calculate from.
 * @param b The second number to calculate from.
 */
const gcd = (a, b) => {
	a = Math.abs(a);
	b = Math.abs(b);

	// Ensure the greatest number is 'a'.
	[a, b] = b > a ? [b, a] : [a, b];

	while (true) {
		if (b == 0)
			return a;

		a %= b;

		if (a == 0)
			return b;

		b %= a;
	}
};

/**
 * Calculates the intervals needed to distribute timing of work and sleep.
 *
 * @param size The count of slots of work out of 100.
 */
const calculateIntervals = size => {
	// Convert the bandwidth into slots out of 100
	const bandwidthAsSlots = size;

	// Work out what number we need to divide by to reduce the slots value.
	const gcdWork = gcd(bandwidthAsSlots, 100 - bandwidthAsSlots);

	// Calculate the number of slots of work and sleep.
	const slotsOfWork = bandwidthAsSlots / gcdWork;
	const slotsOfSleep = (100 - bandwidthAsSlots) / gcdWork;

	// Predefine the return values so if left unchanged they have the default.
	let work = 1, sleep = 1, rWork = 0, rSleep = 0;

	// We need to check if we will have a remainder of work or sleep.
	if (slotsOfSleep === 0) {
		// All work and no sleep...
		sleep = 0;
	} else if (slotsOfWork === 0) {
		// All sleep and no work...
		work = 0;
	} else if (slotsOfWork > slotsOfSleep) {
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

/**
 * Creates a distributed buffer from data.
 *
 * @param size The size that the buffer should be.
 * @param data The data to reate the buffer from.
 */
const createBuffer = (size, data) => {
	// We want to distribute the data into an array.
	const buffer = new Array(size).fill(null);

	// Fill buffer with the data distributed.
	let err = 0;
	for (const server of data) {
		const itemCount = server.priority * 100 + err;
		const roundedItemCount = Math.ceil(itemCount);

		const roundedDistance = Math.round(buffer.length / roundedItemCount);

		let pos = 0;
		for (let i = 0; i < roundedItemCount; i++) {
			pos += roundedDistance % buffer.length;

			// We need to loop because the position may already be filled and
			// we want the next closest position.
			for (let y = 0; true; y++) {
				let insertAt = (pos + y) % buffer.length;

				if (buffer[insertAt] === null) {
					buffer[insertAt] = server.server;
					break;
				}
			}
		}

		// Update error.
		err = itemCount - roundedItemCount;
	}

	return buffer;
};

module.exports = (action, maxBandwidth = 0.5, nonAction = () => {}) => {
	// Obtain and sort the data.
	const data = rawData
		.map(file => ({...file, priority: file.priority * maxBandwidth}))
		.filter(file => file.priority >= 0.01)
		.sort((a,  b) => b.priority - a.priority);

	const buffer = createBuffer(maxBandwidth * 100, data);
	const times = calculateIntervals(maxBandwidth * 100);

	console.log(times);

	// Set interval.
	let counter = 0, currItrCounter = 0, serverCounter = 0, currentServer = 0;
	setInterval(() => {
		const doWork = () => {
			action(buffer[serverCounter]);

			// Increment serverCounter every time we do a server call.
			serverCounter = (serverCounter + 1) % buffer.length;
		};

		if (counter < times.rWork) {
			// Do the remainder work.
			doWork();
		} else if (counter < times.rSleep) {
			// Do the remainder sleep.
			nonAction();
		} else {
			if (currItrCounter < times.work) {
				// Do work
				doWork();
			} else {
				// Sleep
				nonAction();
			}

			// Keep the current iteration ticking over.
			currItrCounter++;

			if (currItrCounter >= times.work + times.sleep)
				currItrCounter = 0;
		}

		// Increment counter
		counter = (counter + 1) % times.total;
	}, 1000);
};
