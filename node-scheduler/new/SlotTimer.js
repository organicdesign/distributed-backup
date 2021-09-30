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
	constructor (work = () => {}, sleep = () => {}) {
		this._action = work;
		this._nonAction = sleep;
		this._intevalId = null;
		this._slotTimes = null;
		this._workUnitSize = 262158;
		this._bandwidth = 1 * 1000 * 1000;
		this._slotIterator = new SlotIterator(50);
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
	 * Set the function to be called when work is requested.
	 *
	 * @param {function} func The work function.
	 */
	setWorkFunction (func) {
		this._action = action;
	}

	/**
	 * Set the function to be called when sleep is requested.
	 *
	 * @param {function} func The sleep function.
	 */
	setSleepFunction (func) {
		this._nonAction = action;
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
	 * Start the timer.
	 */
	start () {
		if (this._intervalId)
			return;

		this._intervalId = setInterval(() => {
			if (this._slotIterator.next() === WORK)
				this._action();
			else
				this._nonAction();
		},  this._workUnitSize * 1000 / this._bandwidth);
	}

	/**
	 * Stop the timer.
	 */
	stop () {
		if (!this._intervalId)
			return;

		clearInterval(this._intervalId)
		this._intervalId = null;
	}
}

module.exports = SlotTimer;
