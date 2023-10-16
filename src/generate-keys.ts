import { resolve } from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { generateMnemonic, generateKeyFile } from "./key-manager/utils.js";

const argv = await yargs(hideBin(process.argv))
	.option({
		mnemonic: {
			alias: "m",
			type: "string"
		}
	})
	.option({
		name: {
			alias: "n",
			type: "string"
		}
	})
	.option({
		path: {
			alias: "p",
			type: "string"
		}
	})
	.parse();

const mnemonic = argv.mnemonic ?? generateMnemonic();
const name = argv.name ?? generateMnemonic().split(" ")[0];

if (argv.mnemonic == null) {
	console.log(`Mnemonic:\n  ${mnemonic}`);
}

if (argv.name == null) {
	console.log(`Name:\n  ${name}`);
}

if (argv.path != null) {
	await generateKeyFile(resolve(argv.path), mnemonic, name);
}
