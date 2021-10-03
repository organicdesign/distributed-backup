const IPFS = require("ipfs-core");

const ipfsPromise = (async () => {
	return await IPFS.create();
})();

module.exports = ipfsPromise;
