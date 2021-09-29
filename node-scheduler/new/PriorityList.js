class PriorityListItem {
	constructor (value, weight) {
		this.value = value;
		this.weight = weight;
		this.percentage = null;
		this.slots = null;
	}
}

class PriorityList {
	constructor (minWeight = 0.01) {
		this._data = [];
		this._minWeight = minWeight;
	}

	add (value, weight) {
		// Items with no weight have no value.
		if (weight <= 0)
			return;

		// Create the new item.
		const item = new PriorityListItem(value, weight);

		// Find the position to insert into.
		let i = 0;
		for (; i < this._data.length; i++) {
			if (weight > this._data[i].weight)
				break;
		}

		// Insert into list.
		this._data.splice(i, 0, item);
	}

	remove (value) {
		let i = 0;
		for (; i < this._data.length; i++) {
			if (value > this._data[i].value)
				break;
		}

		this._data.splice(i, 1);
	}

	getData () {
		let i = 0, a = 0;
		for (; i < this._data.length; i++) {
			a += this._data[i].weight;

			if (this._data[i].weight / a < this._minWeight)
				break;
		}

		return this._calculateSlots(this._data.slice(0, i));
	}

	debug () {
		console.log(this.getData());
	}

	/**
	 * Calculate the percentage values for the items.
	 *
	 * @param {Array.<PriorityListItem>} items The list of items with weight.
	 *
	 * @return {Array.<PriorityListItem>} The list of items with percentages.
	 */
	_calculatePercentages (items) {
		const total = items.reduce((a, v) => a + v.weight, 0);
		return items.map(v => {
			v.percentage = v.weight / total;
			return v;
		});
	}

	/**
	 * Calculate the slot values for the items.
	 *
	 * @param {Array.<PriorityListItem>} items The list of items with percentages.
	 * to round.
	 *
	 * @return {Array.<PriorityListItem>} The list of items with slots.
	 */
	_calculateSlots (items) {
		// Calculate the percentages.
		items = this._calculatePercentages(items);

		// Convert the decimals to percentages.
		items = items.map(v => {
			v.slots = v.percentage * 100;
			return v;
		});

		// Round the percentages factoring in error.
		let e = 0;
		for (let i = 0; i < items.length; i++) {
			const old = items[i].slots;
			items[i].slots = Math.round(items[i].slots);
			e = old - items[i].slots;
		}

		return items;
	}
}

module.exports = PriorityList;
