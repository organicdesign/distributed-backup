const net = require("net");

class MultiplexingService {
	constructor (name, bandwidth, chunkSize) {
		this._bandwidth = bandwidth;
		this._chunkSize = chunkSize;
		this._connections = [];
		this._server = null;
		this._intervalId = null;

		this._setupServer(name);
	}

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

	stop () {
		if (!this._intervalId)
			return;

		clearInterval(this._intervalId);
		this._intervalId = null;
	}

	_setupServer (name) {
		this._server = net.createServer();

		this._server.listen(`/tmp/${name}`);

		this._server.on("connection", s => this._setupSocket(s));
	}

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
