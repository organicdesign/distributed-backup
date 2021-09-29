const Calc = require("./calc");

const SIZE = 100;

class Scheduler {
	constructor (action, nonAction = () => {}) {
		this._buffer = [];
		this._targets = [];
		this._onTarget = console.log;
		this._interval = null;
		this._action = action;
		this._nonAction = nonAction;

		// Work is a generator function so it can be called manually or by the
		// interval.
		this.work = (function*(getBuffer, getAction) {
			let serverCounter = 0;

			for (;;) {
				yield getAction()(getBuffer()[serverCounter]);

				// Increment serverCounter every time we do a server call.
				serverCounter = (serverCounter + 1) % SIZE;
			}
		})(() => this._buffer, () => this._action);

		this.setPacketSize(262158); // Default IPFS block size.
		this.setBandwidth(100000); // 100kps
		this.setBandwidthUsage(0.5); // Use 50% of the bandwidth
	}

	setBandwidthUsage (usage) {
		if (usage <= 0)
			usage = 1 / SIZE;

		if (usage > 1)
			usage = 1;

		this._bandwidthUse = usage;
		this._intervals = Calc.calculateSlots(this._bandwidthUse, SIZE);
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

	setTargetFunc (func) {
		if (typeof func === "function")
			this._onTarget = func;
	}

	setTarget (target, priority) {
		if (priority <= 0)
			return;

		const foundTarget = this._targets.find(t => t[0] === target);
		if (foundTarget)
			return foundTarget[1] = priority;

		this._targets.push([target, priority]);
		this.update();
	}

	removeTarget (target) {
		const foundIndex = this._targets.findIndex(t => t[0] === target);

		if (foundIndex < 0)
			return;

		this._targets.splice(foundIndex, 1);
		this.update();
	}

	getTargets () {
		return this._targets;
	}

	start () {
		if (this._interval)
			return

		let counter = 0, currItrCounter = 0;

		this._interval = setInterval(() => {
			if (counter < this._intervals.rWork) {
				// Do the remainder work.
				this.work.next();
			} else if (counter < this._intervals.rSleep) {
				// Do the remainder sleep.
				this._nonAction();
			} else {
				if (currItrCounter < this._intervals.work) {
					// Do work
					this.work.next();
				} else {
					// Sleep
					this._nonAction();
				}

				// Keep the current iteration ticking over.
				currItrCounter++;

				if (currItrCounter >= this._intervals.work + this._intervals.sleep)
					currItrCounter = 0;
			}

			// Increment counter
			counter = (counter + 1) % this._intervals.total;
		}, this._calcInterval());
	}

	stop () {
		if (!this._interval)
			return;

		clearInterval(this._interval);
		this._interval = null;
	}

	debug () {
		console.log(this._buffer);
	}

	update () {
		let modifiedTargets = Calc.trim(this._targets);

		modifiedTargets = Calc.convertToPercentages(modifiedTargets);
		modifiedTargets = Calc.roundPercentages(modifiedTargets);

		// Load the buffer with the data.
		this._buffer = new Array(SIZE);

		for (const [key, value] of Object.keys(modifiedTargets)) {
			const roundedItemCount = value * SIZE;
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
		}
	}

	_calcInterval () {
		return this._packetSize * 1000 / this._bandwidth;
	}
};

module.exports = Scheduler;
