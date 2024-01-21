import assert from "assert/strict";
import runNode from "./utils/run-node.js";
import runClient from "./utils/run-client.js";

const nodes = ["group"];

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


describe("group", () => {
	let proc: Awaited<ReturnType<typeof runNode>>;

	before(async () => {
		proc = await runNode(nodes[0]);

		await proc.start();
	});

	after(async () => {
		await proc.stop();
	});

	it("lists no groups", async () => {
		const raw = await runClient(nodes[0], "list-groups");
		const data = JSON.parse(raw);

		assert.deepEqual(data, []);
	});

	it("creates a group", async () => {
		const raw = await runClient(nodes[0], "create-group", "test-group");
		const data = JSON.parse(raw);

		assert.deepEqual(data, { address: "bafyreigtyvdxwzhnrui24r2btjmgvwegcz3tmxs5k5tfny4apqxxm23quq" });
	});

	it("lists the created group", async () => {
		const raw = await runClient(nodes[0], "list-groups");
		const data = JSON.parse(raw);

		assert.deepEqual(data, [{
			cid: "bafyreigtyvdxwzhnrui24r2btjmgvwegcz3tmxs5k5tfny4apqxxm23quq",
			count: 0,
			name: "test-group",
			peers: 1
		}]);
	});
});
