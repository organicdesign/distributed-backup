const { SIZE } = require("./constants");

/**
 * The scheduler class creates a iterable based of a priority list.
 */
class Scheduler {
	/**
	 * Create a new schedule from a priority list.
	 *
	 * @param {PriorityList} priorityList The priority list to create the
	 * schedule from.
	 */
	constructor (priorityList) {
		this._buffer = [];
		this._priorityList = priorityList;

		this._serverCounter = 0;
	}

	/**
	 * Log the internals onto the console.
	 */
	debug () {
		console.log(this._buffer);
	}

	/**
	 * Update the internal buffer. This should be called everytime that the list
	 * this was constructed from changes.
	 */
	update () {
		// Load the buffer with the data.
		this._buffer = new Array(SIZE);

		for (const item of this._priorityList.getData().reverse()) {
			const roundedDistance = Math.round(SIZE / item.slots);

			let pos = 0;
			for (let i = 0; i < item.slots; i++) {
				pos += roundedDistance % SIZE;

				// We need to loop because the position may already be filled and
				// we want the next closest position.
				for (let y = 0; true; y++) {
					let insertAt = (pos + y) % SIZE;

					if (!this._buffer[insertAt]) {
						this._buffer[insertAt] = item.value;
						break;
					}
				}
			}
		}
	}

	/**
	 * Get the next value in the sequence. This method allows you to tread this
	 * class similar to a generator function.
	 *
	 * @return {*} The next value in the sequence.
	 */
	next () {
		const value = this._buffer[this._serverCounter];

		this._serverCounter = (this._serverCounter + 1) % SIZE;

		return value;
	}

	// Define the iterator method.
	*[Symbol.iterator] () {
		for (;;)
			yield this.next();
	}
};

module.exports = Scheduler;
