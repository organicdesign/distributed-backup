class Calc {
	/**
	 * Calculates the greatest common divider of two numbers.
	 *
	 * @param a The first number to calculate from.
	 * @param b The second number to calculate from.
	 *
	 * @return The GCD of a and b.
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
	 * @param percentages The list of percentages to round.
	 *
	 * @return The list of percentages that have been rounded.
	 */
	static roundPercentages (percentages) {
		// Convert the decimals to percentages.
		let rp = percentages.map(v => v * 100);

		// Round the percentages factoring in error.
		let e = 0;
		for (let i = 0; i < rp.length; i++) {
			const old = rp[i];
			rp[i] = Math.round(rp[i]);
			e = old - rp[i];
		}

		// Conver back to decimals.
		return rp.map(v => v / 100);
	}

	/**
	 * Convert a list of intergers into percentages. The integers will be
	 * considered to be a value out of the total.
	 *
	 * @param integers The integers to convert to percentages.
	 *
	 * @return The list of percentages.
	 */
	static convertToPercentages (integers) {
		const total = integers.reduce((a, v) => a + v, 0);
		return integers.map(v => v / total);
	}
};

module.exports = Calc;
