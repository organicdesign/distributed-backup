const SIZE = 100;
const MIN_PERCENTAGE = 1 / SIZE;

class Scheduler {
	constructor () {
		this._buffer = new Array(SIZE);
		this._targets = {};
		this._onTarget = console.log;
	}

	setTargetFunc (func) {
		if (typeof func === "function")
			this._onTarget = func;
	}

	setTarget (target, priority) {
		if (priority <= 0)
			return;

		if (this._targets[target] === priority)
			return;

		this._targets[target] = priority;
		this.update();
	}

	removeTarget (target) {
		if (!this._targets[target])
			return;

		delete this._targets[target];
		this.update();
	}

	getTargets () {
		return this._targets;
	}

	start () {
		if (this._interval)
			return

		this._interval = setInterval(() => {
			console.log("Doing something")
		}, 1000);
	}

	stop () {
		if (this._interval)
			clearInterval(this._interval);
	}

	debug () {
		console.log(this._buffer);
	}

	update () {
		// We need the total to convert the priority values to percentages.
		let total = Object.values(this._targets)
			.reduce((acc, value) => acc + value, 0);

		// We need to calculate the total the second time to do the same
		// calculations without the items that will not get a slot.
		const filteredTotal = Object.values(this._targets)
			.filter(value => value / total >= MIN_PERCENTAGE)
			.reduce((acc, value) => acc + value, 0);

		// Create a copy of targets with percentages
		const modifiedTargets = {};

		for (const key of Object.keys(this._targets)) {
			const priorityAsPercent = this._targets[key] / total;

			if (priorityAsPercent < MIN_PERCENTAGE)
				continue;

			modifiedTargets[key] = this._targets[key] / filteredTotal;
		}

		// Load the buffer with the data.
		this._buffer = new Array(SIZE);

		let err = 0;
		for (const key of Object.keys(modifiedTargets)) {
			const itemCount = modifiedTargets[key] * SIZE + err;
			const roundedItemCount = Math.ceil(itemCount);

			const roundedDistance = Math.round(SIZE / roundedItemCount);

			let pos = 0;
			for (let i = 0; i < roundedItemCount; i++) {
				pos += roundedDistance % SIZE;

				// We need to loop because the position may already be filled and
				// we want the next closest position.
				for (let y = 0; true; y++) {
					let insertAt = (pos + y) % SIZE;

					if (!this._buffer[insertAt]) {
						this._buffer[insertAt] = key;
						break;
					}
				}
			}

			// Update error.
			err = itemCount - roundedItemCount;
		}
	}
};

module.exports = Scheduler;
