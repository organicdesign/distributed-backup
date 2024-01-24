import { resolve } from "path";
import fs from "fs/promises";
import readline from "readline/promises";
import { multiaddr } from "multiaddr";

const isYes = (input: string) => /^(?:1|t(?:rue)?|y(?:es)?|ok(?:ay)?)$/i.test(input);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const rawPath = await rl.question("Please enter the path to generate the config file:\n");
const path = resolve(rawPath);

const rawStorage = await rl.question("Please enter the path to store program data in (Leave blank to use memory):\n");
const storage = rawStorage.trim().length === 0 ? ":memory:" : resolve(rawStorage);

const rawUsePsk = await rl.question("Should the network be private?\n");
const usePsk = isYes(rawUsePsk);

const addresses: string[] = [];

console.log("Enter the multi-addresses to bind followed by a new line (leave blank to finish):");

for (;;) {
	const rawAddress = await rl.question("");

	if (rawAddress.trim().length === 0) {
		break;
	}

	try {
		multiaddr(rawAddress);
	} catch (error) {
		console.log("Invalid address.");
		continue;
	}

	addresses.push(rawAddress);
}

const bootstrap: string[] = [];
const useBootStrap = await rl.question("Would you like to specify bootstrap addresses?\n");

if (isYes(useBootStrap)) {
	console.log("Enter the multi-addresses to bootstrap followed by a new line (leave blank to finish):");

	for (;;) {
		const rawBootstrap = await rl.question("");

		if (rawBootstrap.trim().length === 0) {
			break;
		}

		try {
			multiaddr(rawBootstrap);
		} catch (error) {
			console.log("Invalid address.");
			continue;
		}

		bootstrap.push(rawBootstrap);
	}
}

const config = JSON.stringify({
	private: usePsk,
	tickInterval: 0.1,
	storage,
	addresses,
	bootstrap
}, null, 2);

console.log("Created config:");
console.log(config);
const shouldWrite = await rl.question("Is this correct?\n");

if (isYes(shouldWrite)) {
	await fs.writeFile(path, config);
	console.log(`Written config to ${path}`);
} else {
	console.log("Aborting.")
}

rl.close();
