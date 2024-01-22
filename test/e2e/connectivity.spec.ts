import assert from "assert/strict";
import runNode from "./utils/run-node.js";
import runClient from "./utils/run-client.js";

const nodes = ["connectivity-peer-a", "connectivity-peer-b"] as const;

describe("connectivity", () => {
	let proc: Awaited<ReturnType<typeof runNode>>[];

	before(async () => {
		proc = await Promise.all(nodes.map(runNode));

		await Promise.all(proc.map(p => p.start()));
	});

	after(async () => {
		await Promise.all(proc.map(p => p.stop()));
	});

	it("dispalys a tcp address", async () => {
		const raw = await runClient(nodes[0], "addresses");
		const data: string[] = JSON.parse(raw);
		const tcp = data.find(d => d.startsWith("/ip4/127.0.0.1/tcp"));

		assert(tcp);
	});

	it("displays no connections on startup", async () => {
		const raw = await runClient(nodes[0], "connections");
		const data: string[] = JSON.parse(raw);

		assert.deepEqual(data, []);
	});

	it("can connect to another node over tcp", async () => {
		const peerARaw = await runClient(nodes[0], "addresses");
		const peerAData: string[] = JSON.parse(peerARaw);
		const tcp = peerAData.find(d => d.startsWith("/ip4/127.0.0.1/tcp"));

		assert(tcp);

		const peerBRaw = await runClient(nodes[1], "connect", tcp);
		const peerBData = JSON.parse(peerBRaw);

		assert.deepEqual(peerBData, { success: true });
	});

	it("shows the connection on both nodes", async () => {
		await Promise.all(nodes.map(async node => {
			const raw = await runClient(node, "connections");
			const data: string[] = JSON.parse(raw);

			assert(Array.isArray(data));
			assert.equal(data.length, 1);
		}));
	});
});
