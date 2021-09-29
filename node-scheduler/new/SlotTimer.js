const SlotIterator = require("./SlotIterator");

// The constant for identifying sleep in the pattern.
const SLEEP = "sleep";

// The constand for identifying work in the pattern.
const WORK = "work";

class SlotTimer {
	constructor (action = () => {}, nonAction = () => {}) {
		this._action = action;
		this._nonAction = nonAction;
		this._intevalId = null;
		this._slotTimes = null;
		this._packetSize = 262158;
		this._bandwidth = 1 * 1000 * 1000;
		this._slotIterator = new SlotIterator(50);
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

	setAction (action) {
		this._action = action;
	}

	setSlots (slots) {
		if (slots < 0)
			return;

		if (slots > 100)
			slots = 100;

		this._slotIterator = new SlotIterator(slots);
	}

	start () {
		if (this._intervalId)
			return;

		this._intervalId = setInterval(() => {
			if (this._slotIterator.next() === WORK)
				this._action();
			else
				this._nonAction();
		},  this._packetSize * 1000 / this._bandwidth);
	}

	stop () {
		if (!this._intervalId)
			return;

		clearInterval(this._intervalId)
		this._intervalId = null;
	}
}

module.exports = SlotTimer;
