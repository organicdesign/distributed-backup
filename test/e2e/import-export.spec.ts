import assert from "assert/strict";
import Path from "path";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import runNode from "./utils/run-node.js";
import runClient from "./utils/run-client.js";
import { projectPath } from "../../src/utils.js";

const exec = promisify(execCb);

const node = "import-export";
const testDataDir = Path.join(projectPath, "test/e2e/test-data");

describe("import/export", () => {
	let proc: Awaited<ReturnType<typeof runNode>>;
	let group: string;

	before(async () => {
		proc = await runNode(node);

		await proc.start();

		group = (await runClient(node, "create-group", "test")).group;
	});

	after(async () => {
		await proc.stop();
	});

	it("imports a file", async () => {
		const file = Path.join(testDataDir, "file-1.txt");
		const data = await runClient(node, "add", group, file, "/file");

		assert.deepEqual(data, {
			success: true,
			cid: "bafybeihoqexapn3tusc4rrkqztzzemz7y57esnzg7eutsua4ehjkylmjqe"
		});
	});

	it("imports a directory", async () => {
		const data = await runClient(node, "add", group, testDataDir, "/directory");

		assert.deepEqual(data, {
			success: true,
			cid: "bafybeibcmg65b33noyeskjeg2q4gar5i6jlvitjbqrvrv6dspdqxzgx2ma"
		});
	});

	it("imports a sub directory", async () => {
		const dir = Path.join(testDataDir, "dir-1");
		const data = await runClient(node, "add", group, dir, "/directory-2");

		assert.deepEqual(data, {
			success: true,
			cid: "bafybeighjftxut4i5csm55azb4eewvae25brsdglngcidk5a2zlxqeg7zq"
		});
	});

	it("exports a file", async () => {
		const data = await runClient(node, "export", group, "/file", Path.join(projectPath, "test/file-1.txt"));

		assert.deepEqual(data, {
			success: true
		});

		const { stdout: hash1 } = await exec(`sha256sum ${Path.join(testDataDir, "file-1.txt")} | head -c 64`);
		const { stdout: hash2 } = await exec(`sha256sum ${Path.join(projectPath, "test/file-1.txt")} | head -c 64`);

		assert.equal(hash1, hash2);
	});
});
