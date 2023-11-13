import { describe, it, before } from "node:test";
import assert from "assert/strict";
import { fromString as uint8ArrayFromString } from "uint8arrays";
import { nameToPath, decodeKey, encodeKey, bip32, keyToPeerId, generateKeyData } from "../../src/key-manager/utils.js";

const data = [
	{
		mnemonic: "anxiety rib chief game raw skin awkward arrow answer oppose way leopard",
		name: "test",
		key: "5TP9VimJU1WdSoTxZGLhSuPKqCpXirPHDK4ZjHxzetex-8zAV14C4oLe4dytUSVzznTuQ659pY1dSMG8HAQenDqVQ",
		publicKey: "28uzwJB5KrEXQE6s6HgYAgQCLFkpuJoRTary7hKzAmcXh-8zAV14C4oLe4dytUSVzznTuQ659pY1dSMG8HAQenDqVQ",
		psk: "/key/swarm/psk/1.0.0/\n/base16/\n56d3c18282f1f1b1b3e04e40dd5d8bf44cafa8bc9c9bc7c57716a7766fa2c550"
	},

	{
		mnemonic: "hedgehog symbol trumpet rely strong eight property keen rose legend trigger mutual",
		name: "test2",
		key: "8ZFp4wWD4SoJvuBdCAqAjJG5cSSoECJrevqJWfUjQCEi-8yf9PQFFydhXHGJ7ziX57jE533eKHQ8vSqgucLggXzt2",
		publicKey: "23PFvgTSohdTBjh5NxnBsz9RKBX1ahkhNSLCb83aDyjWV-8yf9PQFFydhXHGJ7ziX57jE533eKHQ8vSqgucLggXzt2",
		psk: "/key/swarm/psk/1.0.0/\n/base16/\n34d1809075d4947f628abecdcea877bd2ff29bb441db608487afbf7136313a22"
	},

	{
		mnemonic: "brave exact wonder grape theory salon arrive party rail cargo saddle height",
		name: "server",
		key: "5sj1C5eoUNKizJtusTc7Kzs7EVdkZK61mtHWevp6oVwD-DFs2kfoWCYeUQahLQNKDZiezzqUomtA43rUHWNG9112Y",
		publicKey: "25fju6xfyY9jFuFLFgQSmt9RHzre21P8gmYSC92kK67iq-DFs2kfoWCYeUQahLQNKDZiezzqUomtA43rUHWNG9112Y",
		psk: "/key/swarm/psk/1.0.0/\n/base16/\n6eaf13c66b04c37c4ea14381a6dc691843aa2f8e9e979b8df5e8c9c2a88c840e"
	},

	{
		mnemonic: "divert begin hedgehog zone alien wheel victory eagle matter enroll one inch",
		name: "a long name with spaces",
		key: "Dgqny1ify4jdmCTFiGYznnaRMNk9ASPe11719ffwQwyU-CN1b67hBtzeWrea1ykh8NUWk3s5bHhixSKdwM1WSUy1D",
		publicKey: "whjdDyjaCDKWgLnSLZFsq87CGEkn5wT4cg7j5KTgxZfB-CN1b67hBtzeWrea1ykh8NUWk3s5bHhixSKdwM1WSUy1D",
		psk: "/key/swarm/psk/1.0.0/\n/base16/\n79fba3ed8d5eadf8f8d5805321db83b63a64e7be178aee2b088f6184fa4189fa"
	},

	{
		mnemonic: "bracket raise onion simple hybrid dignity follow observe shoulder bachelor stadium congress",
		name: `1234567890-=!@#$%^&*()_+"':;,./<?>`,
		key: "4YqTpHQfT3UmCzvX76HewsaGGHSriVteB2878YGj395x-AB3GiJpFocYGSxu5KwckLVhUerQAuYMFbDaFirJ61ZcF",
		publicKey: "dHMN5uW7oayJdRPb1xF7HTSwocoxA5v2odhSvPWjqMny-AB3GiJpFocYGSxu5KwckLVhUerQAuYMFbDaFirJ61ZcF",
		psk: "/key/swarm/psk/1.0.0/\n/base16/\n6f3b813e892454b6435e68c51e905d4d707518f7ed80a4f6c3009a2441db4fe2"
	}
];

describe("nameToPath", { concurrency: 4 }, () => {
	let hardenedPaths: string[];
	let unhardenedPaths: string[];
	let allPaths: string[];

	before(async () => {
		hardenedPaths = await Promise.all(data.map(d => nameToPath(d.name)));
		unhardenedPaths = await Promise.all(data.map(d => nameToPath(d.name, false)));
		allPaths = [...hardenedPaths, ...unhardenedPaths];
	});

	it("is determnistic", async () => {
		const paths1 = await Promise.all(data.map(d => nameToPath(d.name)));
		const paths2 = await Promise.all(data.map(d => nameToPath(d.name)));

		assert.deepEqual(paths1, paths2);
	});

	it("is unique", () => {
		const paths = [...allPaths];

		while (paths.length > 0) {
			const item = paths.pop();

			assert(item);
			assert(!paths.includes(item));
		}
	});

	it("returns a path starting with 'm/'", () => {
		for (const path of allPaths) {
			assert.equal(path.substring(0, 2), "m/");
		}
	});

	it("has '/' delimited numbers", () => {
		for (const path of allPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num);
				assert(!Number.isNaN(num));
				assert(num > 0);
			}
		}
	});

	it("non-hardened paths are less than 0x80000000", () => {
		for (const path of unhardenedPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num < 0x80000000);
			}
		}
	});

	it("hardened paths are greater than 0x80000000", () => {
		for (const path of hardenedPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num > 0x80000000);
			}
		}
	});
});

describe("decodeKey", () => {
	it("decodes valid keys", () => {
		for (const { key } of data) {
			assert(decodeKey(key));
		}
	});
});

describe("encodeKey", { concurrency: 4 }, () => {
	it("encodes valid keys", () => {
		for (const { key } of data) {
			assert.equal(encodeKey(decodeKey(key)), key);
		}
	});

	it("throws an error if the private data is missing", () => {
		for (const { publicKey: k } of data) {
			const [publicKey, chainCode] = k.split("-").map(s => uint8ArrayFromString(s, "base58btc"));
			const key = bip32.fromPublicKey(Buffer.from(publicKey), Buffer.from(chainCode));

			assert.rejects(async () => encodeKey(key));
		}
	});
});

describe("keyToPeerId", () => {
	it("converts keys to peerIds", async () => {
		await Promise.all(data.map(d => keyToPeerId(decodeKey(d.key))));
	});
});
