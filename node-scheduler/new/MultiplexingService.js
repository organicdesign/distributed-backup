const net = require("net");

/**
 * The MultiplexingService class is responsible for creating a unix domain
 * socket and managing slots to the connections made on it.
 */
class MultiplexingService {
	/**
	 * Create a new MultiplexingService.
	 *
	 * @param {string} name The name of this service, this should be unique.
	 * @param {number} bandwidth The bandwidth of this service, it should be in
	 * units/second.
	 * @param {number} chunkSize The size of the chunks that requests will be
	 * made for, this should match the base unit defined in bandwidth.
	 */
	constructor (name, bandwidth, chunkSize) {
		this._bandwidth = bandwidth;
		this._chunkSize = chunkSize;
		this._connections = [];
		this._server = null;
		this._intervalId = null;

		this._setupServer(name);
	}

	/**
	 * Start serving slots to the connections.
	 */
	start () {
		if (this._intervalId)
			return;

		let id = 0;
		this._intervalId = setInterval(() => {
			if (this._connections.length <= 0)
				return;

			// Increment id first beause it could be out of bound otherwise.
			id = (id + 1) % this._connections.length;

			this._connections[id].write("\n");
			this._connections[id].needCount--;

			if (this._connections[id].needCount <= 0)
				this._connections.splice(id, 1);
		}, this._chunkSize * 1000 / this._bandwidth);
	}

	/**
	 * Stop serving slots to the connections.
	 */
	stop () {
		if (!this._intervalId)
			return;

		clearInterval(this._intervalId);
		this._intervalId = null;
	}

	/**
	 * Setup the unix domain server.
	 *
	 * @param {string} name The name of this server.
	 */
	_setupServer (name) {
		this._server = net.createServer();

		this._server.listen(`/tmp/${name}`);

		this._server.on("connection", s => this._setupSocket(s));
	}

	/**
	 * Setup the socket events.
	 *
	 * @param {Socket} s The socket to setup.
	 */
	_setupSocket (s) {
		s.on("close", () => {
			// Remove from connections when it closes.
			this._connections.splice(this._connections.indexOf(s), 1);
			s.end();
		});

		s.on("data", data => {
			const index = this._connections.indexOf(s);

			if (index < 0) {
				this._connections.push(s);
				s.needCount = 1;
			} else
				s.needCount++;
		});
	}
}

module.exports = MultiplexingService;
