const ipfsAsync = require("./ipfs");
const fs = require("fs");
const { CID } = require("multiformats/cid");

class FileIterator {
	constructor (path) {
		this._hashes = null;
		this._path = path;
	}

	async chunkify () {
		if (this.hashes)
			return;

		const ipfs = await ipfsAsync;
		const content = fs.readFileSync(this._path);
		this._root = (await ipfs.add({content})).cid;
		this._hashes = await this.getAllLinks(this._root);
		this._iterator = this._hashes.values();
	}

	debug () {
		console.log(this._hashes)
	}

	async getAllLinks (hash, linkSet = null) {
		if (!linkSet)
			linkSet = new Set();

		linkSet.add(hash);

		const ipfs = await ipfsAsync;
		const dag = await ipfs.dag.get(hash);
		const links = dag.value.Links.map(obj => obj.Hash);

		for (const link of links)
			await this.getAllLinks(link, linkSet);

		return linkSet;
	}

	next () {
		return this._iterator.next();
	}

	*[Symbol.iterator] () {
		for (;;) {
			const next = this.next();
			yield next;

			if (next.done)
				break;
		}
	}
}

module.exports = FileIterator;
