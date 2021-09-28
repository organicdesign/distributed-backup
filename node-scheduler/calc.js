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
		const roundedPercentages = percentages.map(v => Math.floor(v * 100) / 100);
		const total = roundedPercentages.reduce((a, v) => a + v, 0);

		// Don't really care how these remainders get distributed - just as long
		// as they do.
		const numberCut = (1 - total) * 100;

		for (let i = 0; i < numberCut; i++)
			roundedPercentages[i % percentages.length] += 0.01;

		return roundedPercentages;
	}
};

module.exports = Calc;
