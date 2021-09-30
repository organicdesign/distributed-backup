const ipfsAsync = require("./ipfs");
const fs = require("fs");
const { CID } = require("multiformats/cid");

class FileIterator {
	/**
	 * Create a new file iterator.
	 *
	 * @param {string} path The path to the file to iterate over.
	 */
	constructor (path) {
		this._hashes = null;
		this._path = path;
	}

	/**
	 * Log the internal hashes to the console.
	 */
	debug () {
		console.log(this._hashes)
	}

	/**
	 * Read and convert the file into chunks.
	 *
	 * @return {Promise<Set.CID>} The set of CID's pointing to the chunks.
	 */
	async chunkify () {
		if (this._hashes)
			return;

		const ipfs = await ipfsAsync;
		const content = fs.readFileSync(this._path);
		this._root = (await ipfs.add({content})).cid;
		this._hashes = await this._getAllLinks(this._root);
		this._iterator = this._hashes.values();

		return this._hashes;
	}

	/**
	 * Get a set of all links and sub-links of a CID.
	 *
	 * @param {CID} hash The root CID to get links for.
	 * @param {Set.CID} linkSet The set of CIDs already found. Defaults to an
	 * empty set.
	 *
	 * @return {Set.CID} The set of all links found in the CID.
	 */
	async _getAllLinks (hash, linkSet = null) {
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

	/**
	 * Get the next chunk of this file. The method 'chunkify' must be called
	 * first.
	 *
	 * @return {CID} The CID of the next chunk.
	 */
	next () {
		return this._iterator.next();
	}

	// Define the iterator method.
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
