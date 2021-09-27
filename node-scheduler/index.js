const schedule = require("./retriever");
const data = require("./retriever-data.json");

const names = {};

for (const server of data)
	names[server.server] = 0;

const output = () => {
	console.log();
	console.log();
	console.log();
	for (const name of Object.keys(names)) {
		let space = "\t";

		if (name.length <= 12)
			space += "\t";

		console.log(`${name}:${space}${names[name]}`);
	}
};

schedule(name => {
	names[name]++;
	output();
});
