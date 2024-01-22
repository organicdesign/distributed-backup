import assert from "assert/strict";
import Path from "path";
import runNode from "./utils/run-node.js";
import runClient from "./utils/run-client.js";
import { projectPath } from "../../src/utils.js";

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
});
