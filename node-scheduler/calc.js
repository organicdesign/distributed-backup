class Calc {
	/**
	 * Calculates the greatest common divider of two numbers.
	 *
	 * @param {number} a The first number to calculate from.
	 * @param {number} b The second number to calculate from.
	 *
	 * @return {number} The GCD of a and b.
	 */
	static gcd (a, b) {
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

	/**
	 * Rounds a list of percentages.
	 *
	 * @param {Array.<number>} percentages The list of percentages (as decimals)
	 * to round.
	 *
	 * @return {Array.<number>} The list of percentages that have been rounded.
	 */
	static roundPercentages (percentages) {
		// Convert the decimals to percentages.
		let rp = percentages.map(v => [v[0], v[1] * 100]);

		// Round the percentages factoring in error.
		let e = 0;
		for (let i = 0; i < rp.length; i++) {
			const old = rp[i][1];
			rp[i][1] = Math.round(rp[i][1]);
			e = old - rp[i][1];
		}

		// Conver back to decimals.
		return rp.map(v => [v[0], v[1] / 100]);
	}

	/**
	 * Removes all values lower than the minimum and recalculates.
	 *
	 * @param {Array.<number>} percentages The values to trim.
	 * @param {number} minimum Values under this number will be trimmed.
	 *
	 * @return {Array.<number>} The percentages after trimming.
	 */
	static trimPercenatages (percentages, minimum = 0.01) {
		const p = [...percentages];

		// Locate the lowest value
		let minIndex = -1;
		for (let i = 0; i < p.length; i++) {
			if (p[i][1] < minimum)
				minIndex = i;
		}

		// If all values are good return.
		if (minIndex < 0)
			return p;

		// Remove the worst value.
		p.splice(minIndex, 1);

		// Recalculate the percentages.
		const rp = this.convertToPercentages(p);

		// Find additional bad values.
		return this.trimPercenatages(rp);
	}

	/**
	 * Removes all numbers that won't meet the minimum percentage requirement.
	 * This has much better performance than doing this after percentage
	 * conversion.
	 *
	 * @param {Array.number} integers The integers to inspect.
	 *
	 * @return {Array.number} The sorted array of integers that meet this
	 * minimum requirement.
	 */
	static trim (integers, minimum = 0.01) {
		const ti = integers.sort((a, b) => b[1] - a[1]);

		let i = 0, a = 0;
		for (; i < ti.length; i++) {
			a += integers[i][1];

			if (ti[i][1] / a < minimum)
				break;
		}

		// Return the valid values.
		return ti.slice(0, i);
	}

	/**
	 * Convert a list of intergers into percentages. The integers will be
	 * considered to be a value out of the total.
	 *
	 * @param {Array.<number>} integers The integers to convert to percentages.
	 *
	 * @return {Array.<number>} The list of percentages (as decimals).
	 */
	static convertToPercentages (integers) {
		const total = integers.reduce((a, v) => a + v[1], 0);
		return integers.map(v => [v[0], v[1] / total]);
	}

	/**
	 * @typedef {Object} Slots
	 *
	 * @property {number} work The number of slots of re-occuring work.
	 * @property {number} sleep The number of slots of re-occuring sleep.
	 * @property {number} rWork The excess slots of work.
	 * @property {number} rSleep The excess slots of sleep.
	 * @property {number} total The number of slots needed to complete the
	 * pattern.
	 */

	/**
	 * Calculates the intervals needed to distribute timing of work and sleep.
	 *
	 * @param {number} size The number of working slots.
	 * @param {number} [total = 100] The total number of slots to calculate for.
	 *
	 * @return {Slots} The slots that are needed to fill in order to distribute
	 * load.
	 */
	static calculateSlots (slots, total = 100) {
		// Work out what number we need to divide by to reduce the slots value.
		const gcdWork = this.gcd(slots, total - slots);

		// Calculate the number of slots of work and sleep.
		const slotsOfWork = slots / gcdWork;
		const slotsOfSleep = (total - slots) / gcdWork;

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
			const rGcdWork = this.gcd(slotsOfWork - rWork, slotsOfSleep);

			// We only need to work out how much work needs to be done for 1 sleep.
			work = (slotsOfWork - rWork) / rGcdWork;
		} else {
			// Calculate the remainder of sleep.
			rSleep = slotsOfSleep % slotsOfWork;

			// Use the remainder to reduce the sleep value as low as possible.
			const rGcdWork = this.gcd(slotsOfWork, slotsOfSleep - rSleep);

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

module.exports = Calc;
