const { SIZE } = require("./constants");

/**
 * The PriorityListItem class is responsible for holding the useful values of a
 * PriorityList item.
 */
class PriorityListItem {
	/**
	 * Create a PriorityListItem with a value and weight.
	 *
	 * @param {*} value The value of this item.
	 * @param {number} weight The weight of this item.
	 */
	constructor (value, weight) {
		this.value = value;
		this.weight = weight;
		this.percentage = null;
		this.slots = null;
	}
}

/**
 * The PriorityList class is responsible for keeping track of weighted items and
 * providing useful data for them.
 */
class PriorityList {
	/**
	 * Create a new PriorityList.
	 *
	 * @param {number} [minWeight=0.01] The minimum weight of an item expressed
	 * as a decimal percentage.
	 */
	constructor (minWeight = 0.01) {
		this._data = [];
		this._minWeight = minWeight;
	}

	/**
	 * Log the class internals onto the console.
	 */
	debug () {
		console.log(this._data);
	}

	/**
	 * Add a value to the list.
	 *
	 * @param {*} value The value to add to the list.
	 * @param {number} weight The weight of this value.
	 */
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

	/**
	 * Remove a value from the list.
	 *
	 * @param {*} value The value to remove.
	 */
	remove (value) {
		let i = 0;
		for (; i < this._data.length; i++) {
			if (value === this._data[i].value)
				break;
		}

		this._data.splice(i, 1);
	}

	/**
	 * Get the relevant, ordered list data with additional properties.
	 *
	 * @return {Array.PriorityListItem} The list data.
	 */
	getData () {
		let i = 0, a = 0;
		for (; i < this._data.length; i++) {
			a += this._data[i].weight;

			if (this._data[i].weight / a < this._minWeight)
				break;
		}

		return this._calculateSlots(this._data.slice(0, i));
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
			v.slots = v.percentage * SIZE;
			return v;
		});

		// Round the percentages factoring in error.
		let e = 0;
		for (let i = 0; i < items.length; i++) {
			const old = items[i].slots + e;
			items[i].slots = Math.round(old);
			e = old - items[i].slots;
		}

		return items;
	}
}

module.exports = PriorityList;
