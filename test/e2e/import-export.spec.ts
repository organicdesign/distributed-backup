import assert from "assert/strict";
import Path from "path";
import fs from "fs/promises";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import runNode from "./utils/run-node.js";
import runClient from "./utils/run-client.js";
import { projectPath } from "../../src/daemon/utils.js";

const exec = promisify(execCb);

const node = "import-export";
const testDataDir = Path.join(projectPath, "test/e2e/test-data");

const data = [
	{
		import: Path.join(testDataDir, "file-1.txt"),
		export: Path.join(projectPath, "test/file-1.txt"),
		virtual: "/file-1.txt"
	},
	{
		import: testDataDir,
		export: Path.join(projectPath, "test/parent"),
		virtual: "/parent"
	},
	{
		import: Path.join(testDataDir, "dir-1"),
		export: Path.join(projectPath, "test/subdir"),
		virtual: "/subdir"
	}
] as const;

describe("import/export", () => {
	let proc: Awaited<ReturnType<typeof runNode>>;
	let group: string;

	before(async () => {
		proc = await runNode(node);

		await proc.start();

		group = (await runClient(node, "create-group", "test")).group;

		await Promise.allSettled(data.map(d => fs.rm(d.export, { recursive: true })));
	});

	after(async () => {
		await proc.stop();
		await Promise.allSettled(data.map(d => fs.rm(d.export, { recursive: true })));
	});

	it("imports a file", async () => {
		const response = await runClient(node, "add", group, data[0].import, data[0].virtual);

		assert.deepEqual(response, {
			success: true,
			cid: "bafybeihoqexapn3tusc4rrkqztzzemz7y57esnzg7eutsua4ehjkylmjqe"
		});
	});

	it("imports a directory", async () => {
		const response = await runClient(node, "add", group, data[1].import, data[1].virtual);

		assert.deepEqual(response, {
			success: true,
			cid: "bafybeibcmg65b33noyeskjeg2q4gar5i6jlvitjbqrvrv6dspdqxzgx2ma"
		});
	});

	it("imports a sub directory", async () => {
		const response = await runClient(node, "add", group, data[2].import, data[2].virtual);

		assert.deepEqual(response, {
			success: true,
			cid: "bafybeighjftxut4i5csm55azb4eewvae25brsdglngcidk5a2zlxqeg7zq"
		});
	});

	it("exports a file", async () => {
		const response = await runClient(node, "export", group, data[0].virtual, data[0].export);

		assert.deepEqual(response, {
			success: true
		});

		const { stdout: hash1 } = await exec(`sha256sum ${data[0].import} | head -c 64`);
		const { stdout: hash2 } = await exec(`sha256sum ${data[0].export} | head -c 64`);

		assert.equal(hash1, hash2);
	});

	it("exports a directory", async () => {
		const response = await runClient(node, "export", group, data[1].virtual, data[1].export);

		assert.deepEqual(response, {
			success: true
		});

		const { stdout: hash1 } = await exec(`find ${data[1].import} -type f -exec cat {} \\; | shasum -`);
		const { stdout: hash2 } = await exec(`find ${data[1].export} -type f -exec cat {} \\; | shasum -`);

		assert.equal(hash1, hash2);
	});
});
