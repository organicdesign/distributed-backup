// Define the slot count to calculate for.
const SIZE = 100;

class SlotTimes {
	constructor (work, sleep, rWork, rSleep, total) {
		this.work = work;
		this.sleep = sleep;
		this.rWork = rWork;
		this.rSleep = rSleep;
		this.total = total;
	}
}

class SlotTimer {
	constructor (action = () => {}) {
		this._action = action;
		this._intevalId = null;
		this._slotTimes = null;
		this._packetSize = 262158;
		this._bandwidth = 1 * 1000 * 1000;
		this._slotTimes = this._calculateSlots(50);
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

	setAction (action) {
		this._action = action;
	}

	setWorkSlots (slots) {
		if (slots < 0)
			return;

		if (slots > 100)
			slots = 100;

		this._slotTimes = this._calculateSlots(slots);
	}

	start () {
		if (this._intervalId)
			return;

		this._intervalId = setInterval(this._action,  this._packetSize * 1000 / this._bandwidth);
	}

	stop () {
		if (!this._intervalId)
			return;

		clearInterval(this._intervalId)
		this._intervalId = null;
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

module.exports = SlotTimer;
