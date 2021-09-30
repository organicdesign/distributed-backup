const ipfsAsync = require("./ipfs");
const fs = require("fs");
const { CID } = require("multiformats/cid");

/**
 * The Chunk class is responsible for holding information about a chunk.
 */
class Chunk {
	/**
	 * Construct a new chunk.
	 *
	 * @param {CID} cid The CID for this chunk.
	 * @param {Buffer} content The content for this chunk.
	 */
	constructor (cid, content) {
		this.cid = cid;
		this.content = content;
	}
}

/**
 * The FileIterator class is responsible for splitting a file into chunks and
 * iterating over those chunks.
 */
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
			await this._getAllLinks(link, linkSet);

		return linkSet;
	}

	/**
	 * Get the next chunk of this file. The method 'chunkify' must be called
	 * first.
	 *
	 * @return {Chunk} The next chunk.
	 */
	async next () {
		const nextCid = this._iterator.next();

		if (nextCid.done)
			return nextCid;

		const ipfs = await ipfsAsync;
		const content = await ipfs.block.get(nextCid.value);

		return {
			done: nextCid.done,
			value: new Chunk(nextCid.value, content)
		};
	}

	// Define the iterator method.
	async *[Symbol.asyncIterator] () {
		for (;;) {
			const next = await this.next();
			yield next;

			if (next.done)
				break;
		}
	}
}

module.exports = FileIterator;
