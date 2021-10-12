const crypto = require("crypto");

/**
 * This class is responsible for generating proofs for content with a given hash.
 */
class Proof {
	/**
	 * Create a proof of the given buffer with the hash.
	 *
	 * @param {Array.byte} buffer The content to create a proof for.
	 * @param {string} hash The hexadecimal hash to generate the proof with.
	 *
	 * @return A SHA256 proof.
	 */
	static create (buffer, hash) {
		const newBuffer = Buffer.from(buffer);
		const positions = hash.match(/(.{1,4})/g).map(v => parseInt(v, 16));

		for (const position of positions) {
			const safePos = position % (newBuffer.length * 8);
			const bufferPos = Math.floor(safePos / 8);
			const bitPos = safePos % 8;

			const byte = newBuffer[bufferPos];
			const alteredByte = this.flipBit(byte, bitPos);

			newBuffer[bufferPos] = alteredByte;
		}

		return crypto.createHash("sha256").update(newBuffer).digest("hex");
	}

	/**
	 * Generate a random hash of a specific length.
	 *
	 * @param {number} bits The length in bits of the hash.
	 *
	 * @return The randomly generated hash of the specified length.
	 */
	static generateHash (bits = 256) {
		return crypto.randomBytes(bits / 8).toString("hex");
	}

	/**
	 * Flip a specific bit in a byte.
	 *
	 * @param {byte} byte The byte to modify.
	 * @param {number} bit The position of the bit to flip.
	 *
	 * @return The byte with the bit flipped.
	 */
	static flipBit(byte, bit) {
		const byteAsStr = ("00000000" + byte.toString(2)).slice(-8);
		const byteAsArray = byteAsStr.split("");

		byteAsArray[bit] = byteAsArray[bit] === "1" ? "0" : "1";

		return parseInt(byteAsArray.join(""), 2);
	}
}

module.exports = Proof;
