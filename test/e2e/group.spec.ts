import assert from "assert/strict";
import runNode from "./utils/run-node.js";
import runClient from "./utils/run-client.js";

const nodes = ["group-peer-a", "group-peer-b"] as const;

const GROUP = "bafyreidv23vfxp5ntctw3wr7j4rvbyvzyg7fnze4iznjmdwhezp4a3gozy";

describe("group", () => {
	let proc: Awaited<ReturnType<typeof runNode>>[];

	before(async () => {
		proc = await Promise.all(nodes.map(runNode));

		await Promise.all(proc.map(p => p.start()));
	});

	after(async () => {
		await Promise.all(proc.map(p => p.stop()));
	});

	it("lists no groups", async () => {
		const data = JSON.parse(await runClient(nodes[0], "list-groups"));

		assert.deepEqual(data, []);
	});

	it("creates a group", async () => {
		const data = JSON.parse(await runClient(nodes[0], "create-group", "test-group"));

		assert.deepEqual(data, { address: GROUP });
	});

	it("lists the created group", async () => {
		const data = JSON.parse(await runClient(nodes[0], "list-groups"));

		assert.deepEqual(data, [{
			cid: GROUP,
			count: 0,
			name: "test-group",
			peers: 1
		}]);
	});

	it("joins a group", async () => {
		// Connect the nodes.
		const peerAData: string[] = JSON.parse(await runClient(nodes[0], "addresses"));
		const tcp = peerAData.find(d => d.startsWith("/ip4/127.0.0.1/tcp"));

		assert(tcp);

		const peerBData = JSON.parse(await runClient(nodes[1], "connect", tcp));

		assert.deepEqual(peerBData, { success: true });

		// Joins the group.
		const joinData = JSON.parse(await runClient(nodes[1], "join-group", GROUP));

		assert.deepEqual(joinData, { success: true, group: GROUP })
	});

	it("lists the joined group", async () => {
		const data = JSON.parse(await runClient(nodes[1], "list-groups"));

		assert.deepEqual(data, [{
			cid: GROUP,
			count: 0,
			name: "test-group",
			peers: 2
		}]);
	});
});
