const SlotIterator = require("./SlotIterator");
const { SLEEP, WORK } = require("./constants");

/**
 * The slot timer class is responsible for calling actions at specific times
 * based on the criteria: bandwidth, work unit size and work percentage (slots).
 */
class SlotTimer {
	/**
	 * Create a new slot timer.
	 *
	 * @param {function} work The action to perform when work is requested.
	 * @param {function} sleep The action to perform when sleep is requested.
	 */
	constructor () {
		this._slotTimes = null;
		this._workUnitSize = 262158;
		this._bandwidth = 1 * 1000 * 1000;
		this._slotIterator = new SlotIterator(50);

		this._resolve = null;
		this._resolveSleep = null;

		this._startTimer();
	}

	/**
	 * Set the work unit size.
	 *
	 * @param {number} size The size of the work unit.
	 */
	setWorkUnitSize (size) {
		if (size <= 0)
			return;

		this._workUnitSize = size;
	}

	/**
	 * Set bandwidth speed. This should be in units/second where units is the
	 * same unit that the workUnitSize is in.
	 *
	 * @param {number} speed The bandwidth speed.
	 */
	setBandwidth (speed) {
		if (speed <= 0)
			return;

		this._bandwidth = speed;
	}

	/**
	 * Set the working slots.
	 *
	 * @param {number} slots The number of work slots to set to. This value
	 * should be between 0 and 100 and can be thought of as a percentage.
	 */
	setSlots (slots) {
		if (slots < 0)
			return;

		if (slots > 100)
			slots = 100;

		this._slotIterator = new SlotIterator(slots);
	}

	/**
	 * Get the next sleep slot.
	 *
	 * @return {Promise} Resolves when the next sleep slot is called.
	 */
	async nextSleep () {
		return new Promise(resolve => {
			this._resolveSleep = resolve;
		});
	}

	/**
	 * Get the next work slot.
	 *
	 * @return {Promise} Resolves when the next work slot is called.
	 */
	async next () {
		return new Promise(resolve => {
			this._resolve = resolve;
		});
	}

	// Define the iterator method.
	async *[Symbol.asyncIterator] () {
		for (;;)
			yield await this.next();
	}

	/**
	 * Start the timer.
	 */
	_startTimer () {
		setInterval(() => {
			if (this._slotIterator.next() === WORK) {
				if (this._resolve)
					this._resolve();
			} else {
				if (this._resolveSleep)
					this._resolveSleep();
			}
		},  this._workUnitSize * 1000 / this._bandwidth);
	}
}

module.exports = SlotTimer;
