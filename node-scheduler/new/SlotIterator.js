// Define the slot count to calculate for.
const SIZE = 100;

// The constant for identifying sleep in the pattern.
const SLEEP = "sleep";

// The constand for identifying work in the pattern.
const WORK = "work";

class SlotTimes {
	/**
	 * Create a new set of slot times.
	 *
	 * @param {number} work The number of repeating work slots.
	 * @param {number} sleep The number of repeating sleep slots.
	 * @param {number} rWork The remainder work slots.
	 * @param {number} rSleep The remainder sleep slots.
	 * @param {number} total The total number of slots.
	 */
	constructor (work, sleep, rWork, rSleep, total) {
		this.work = work;
		this.sleep = sleep;
		this.rWork = rWork;
		this.rSleep = rSleep;
		this.total = total;
	}
}

class SlotIterator {
	constructor (workSlotCount = 50) {
		this._slotTimes = this._calculateSlots(workSlotCount);

		this._counter = 0;
		this._currItrCounter = 0;
	}

	/**
	 * Get the next value in the sequence. This method allows you to tread this
	 * class similar to a generator function.
	 *
	 * @return {*} The next value in the sequence.
	 */
	next () {
		let action = SLEEP;

		if (this._counter < this._slotTimes.rWork)
			action = WORK;
		else if (this._counter >= this._slotTimes.rSleep) {
			if (this._currItrCounter < this._slotTimes.work)
				action = WORK;

			// Keep the current iteration ticking over.
			this._currItrCounter++;

			if (this._currItrCounter >= this._slotTimes.work + this._slotTimes.sleep)
				this._currItrCounter = 0;
		}

		// Increment counter
		this._counter = (this._counter + 1) % this._slotTimes.total;

		return action;
	}

	// Define the iterator method.
	*[Symbol.iterator] () {
		for (;;)
			yield this.next();
	}

	/**
	 * Calculates the intervals needed to distribute timing of work and sleep.
	 *
	 * @param {number} size The number of working slots.
	 *
	 * @return {Slots} The slots that are needed to fill in order to distribute
	 * load.
	 */
	_calculateSlots (slots) {
		// Work out what number we need to divide by to reduce the slots value.
		const gcdWork = this._gcd(slots, SIZE - slots);

		// Calculate the number of slots of work and sleep.
		const slotsOfWork = slots / gcdWork;
		const slotsOfSleep = (SIZE - slots) / gcdWork;

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

		return new SlotTimes(
			work,
			sleep,
			rWork,
			rSleep,
			slotsOfWork + slotsOfSleep,
		);
	};

	/**
	 * Calculates the greatest common divider of two numbers.
	 *
	 * @param {number} a The first number to calculate from.
	 * @param {number} b The second number to calculate from.
	 *
	 * @return {number} The GCD of a and b.
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
	}
}

module.exports = SlotIterator;
