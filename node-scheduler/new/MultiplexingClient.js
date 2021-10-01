const net = require("net");
const { SERVICE_DIRECTORY } = require("./constants");

/**
 * The MultiplexingClient class is responsible for connecting to a unix domain
 * socket and requesting slots.
 */
class MultiplexingClient {
	/**
	 * Create a new multiplexing client.
	 *
	 * @param {string} name The name of the service to connect to.
	 */
	constructor (name) {
		this._client = net.connect(`${SERVICE_DIRECTORY}${name}`);
		this._resolve = null;

		this._client.on("data", data => {
			if (this._resolve)
				this._resolve();
		});
	}

	/**
	 * Request the next slot in the service.
	 *
	 * @return {Promise} A promise that resolves when the requested slot has
	 * been granted.
	 */
	async next () {
		return new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._client.write("\n");
		});
	}

	// Define the iterator method.
	async *[Symbol.asyncIterator] () {
		for (;;)
			yield await this.next();
	}
}

module.exports = MultiplexingClient;
