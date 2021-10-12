const ipfsAsync = require("./classes/ipfs");
const fs = require("fs");

(async () => {
	const ipfs = await ipfsAsync;

	const data = fs.readFileSync("./out");
	console.log(data, data.toString());
	ipfs.dag.put(data, { format: "dag-pb" });
})();
