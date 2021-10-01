const ipfsAsync = require("./ipfs");

/**
 * The BlockWriter class is responsible for saving the blocks to IPFS. 
 */
class BlockWriter {
	static async write (chunk) {
		const ipfs = await ipfsAsync;
		console.log("Writing.");
		console.log("CID:", chunk.cid);
		console.log("Content:", chunk.content);
	}
}
