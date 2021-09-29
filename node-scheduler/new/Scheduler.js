const Calc = require("../calc");

const SIZE = 100;

class Scheduler {
	constructor (priorityList, action, nonAction = () => {}) {
		this._buffer = [];
		this._targets = [];
		this._action = action;
		this._nonAction = nonAction;
		this._priorityList = priorityList;

		// Work is a generator function so it can be called manually or by the
		// interval.
		const generator = this._createGenerator();
		this.next = () => generator.next();
	}

	[Symbol.iterator]() {
		return { // return the next method, need for iterator
			next: this.next
		};
	}

	debug () {
		console.log(this._buffer);
	}

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

	* _createGenerator () {
		let serverCounter = 0;

		for (;;) {
			yield this._action(this._buffer[serverCounter]);

			// Increment serverCounter every time we do a server call.
			serverCounter = (serverCounter + 1) % SIZE;
		}
	}
};

module.exports = Scheduler;
