const SIZE = 100;

class Scheduler {
	constructor (action, nonAction = () => {}) {
		this._buffer = [];
		this._targets = {};
		this._onTarget = console.log;
		this._interval = null;
		this._action = action;
		this._nonAction = nonAction;

		this.work = (function*(getBuffer) {
			let serverCounter = 0;

			for (;;) {
				yield getBuffer()[serverCounter];

				// Increment serverCounter every time we do a server call.
				serverCounter = (serverCounter + 1) % SIZE;
			}
		})(() => this._buffer);

		this.setPacketSize(262158); // Default IPFS block size.
		this.setBandwidth(100000); // 100kps
		this.setBandwidthUsage(0.5); // Use 50% of the bandwidth
	}

	setBandwidthUsage (usage) {
		if (usage <= 0)
			usage = _calcMinPercentage();

		if (usage > 1)
			usage = 1;

		this._bandwidthUse = usage;
		this._intervals = this._calculateIntervals();
	}

	setPacketSize (size) {
		if (size <= 0)
			return;

		this._packetSize = size;
	}

	setBandwidth (speed) {
		if (speed <= 0)
			return;

		this._bandwidth = speed;
	}

	setTargetFunc (func) {
		if (typeof func === "function")
			this._onTarget = func;
	}

	setTarget (target, priority) {
		if (priority <= 0)
			return;

		if (this._targets[target] === priority)
			return;

		this._targets[target] = priority;
		this.update();
	}

	removeTarget (target) {
		if (!this._targets[target])
			return;

		delete this._targets[target];
		this.update();
	}

	getTargets () {
		return this._targets;
	}

	start () {
		if (this._interval)
			return

		let counter = 0, currItrCounter = 0;

		this._interval = setInterval(() => {
			if (counter < this._intervals.rWork) {
				// Do the remainder work.
				this._action(this.work.next().value);
			} else if (counter < this._intervals.rSleep) {
				// Do the remainder sleep.
				this._nonAction();
			} else {
				if (currItrCounter < this._intervals.work) {
					// Do work
					this._action(this.work.next().value);
				} else {
					// Sleep
					this._nonAction();
				}

				// Keep the current iteration ticking over.
				currItrCounter++;

				if (currItrCounter >= this._intervals.work + this._intervals.sleep)
					currItrCounter = 0;
			}

			// Increment counter
			counter = (counter + 1) % this._intervals.total;
		}, this._calcInterval());
	}

	stop () {
		if (!this._interval)
			return;

		clearInterval(this._interval);
		this._interval = null;
	}

	debug () {
		console.log(this._buffer);
	}

	update () {
		// We need the total to convert the priority values to percentages.
		let total = Object.values(this._targets)
			.reduce((acc, value) => acc + value, 0);

		// We need to calculate the total the second time to do the same
		// calculations without the items that will not get a slot.
		const filteredTotal = Object.values(this._targets)
			.filter(value => value / total >= this._calcMinPercentage())
			.reduce((acc, value) => acc + value, 0);

		// Create a copy of targets with percentages
		const modifiedTargets = {};

		for (const key of Object.keys(this._targets)) {
			const priorityAsPercent = this._targets[key] / total;

			if (priorityAsPercent < this._calcMinPercentage())
				continue;

			modifiedTargets[key] = this._targets[key] / filteredTotal;
		}

		// Load the buffer with the data.
		this._buffer = new Array(SIZE);

		let err = 0;
		for (const key of Object.keys(modifiedTargets)) {
			const itemCount = modifiedTargets[key] * SIZE + err;
			const roundedItemCount = Math.ceil(itemCount);

			const roundedDistance = Math.round(SIZE / roundedItemCount);

			let pos = 0;
			for (let i = 0; i < roundedItemCount; i++) {
				pos += roundedDistance % SIZE;

				// We need to loop because the position may already be filled and
				// we want the next closest position.
				for (let y = 0; true; y++) {
					let insertAt = (pos + y) % SIZE;

					if (!this._buffer[insertAt]) {
						this._buffer[insertAt] = key;
						break;
					}
				}
			}

			// Update error.
			err = itemCount - roundedItemCount;
		}
	}

	_calcMinPercentage () {
		return 1 / SIZE;
	}

	_calcInterval () {
		return this._packetSize * 1000 / this._bandwidth;
	}

	/**
	 * Calculates the greatest common divider of two numbers.
	 *
	 * @param a The first number to calculate from.
	 * @param b The second number to calculate from.
	 */
	_gcd (a, b) {
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
	_calculateIntervals () {
		// Convert the bandwidth into slots out of 100
		const bandwidthAsSlots = this._bandwidthUse * SIZE;

		// Work out what number we need to divide by to reduce the slots value.
		const gcdWork = this._gcd(bandwidthAsSlots, 100 - bandwidthAsSlots);

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
			const rGcdWork = this._gcd(slotsOfWork - rWork, slotsOfSleep);

			// We only need to work out how much work needs to be done for 1 sleep.
			work = (slotsOfWork - rWork) / rGcdWork;
		} else {
			// Calculate the remainder of sleep.
			rSleep = slotsOfSleep % slotsOfWork;

			// Use the remainder to reduce the sleep value as low as possible.
			const rGcdWork = this._gcd(slotsOfWork, slotsOfSleep - rSleep);

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
};

module.exports = Scheduler;
