import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import Path from "path";
import fs from "fs/promises";
import { toString as uint8ArrayToString } from "uint8arrays";
import { DeferredPromise } from "@open-draft/deferred-promise";
import { projectPath } from "../../src/utils.js";

const socket = Path.join(projectPath, "test/e2e/node-a.socket");
const tsNode = Path.join(projectPath, "node_modules/ts-node/dist/bin.js");

const args = [
	Path.join(projectPath, "src/daemon.ts"),
	"-k", Path.join(projectPath, "test/e2e/key.json"),
	"-c", Path.join(projectPath, "test/e2e/config.json"),
	"-s", socket
];

const cleanSocket = async () => {
	try {
		await fs.rm(socket);
	} catch {
		// Ignore...
	}
}

before(async () => {
	await cleanSocket();
});

after(async () => {
	await cleanSocket();
});

describe("lifecycle", () => {
	let proc: ChildProcessWithoutNullStreams;

	before(() => {
		proc = spawn(tsNode, args, { env: { ...process.env, DEBUG: "backup:*" } });
	});

	after(() => {
		proc.kill(9);
	});

	it("outputs started after startup", async () => {
		const promise: DeferredPromise<void> = new DeferredPromise();

		const listener = (chunk: Uint8Array) => {
			if (uint8ArrayToString(chunk).includes("started")) {
				promise.resolve();
			}
		};

		proc.stderr.on("data", listener);

		await promise;

		proc.stderr.off("data", listener);
	});

	it("outputs ended after sigint", async () => {
		const promise: DeferredPromise<void> = new DeferredPromise();

		const listener = (chunk: Uint8Array) => {
			if (uint8ArrayToString(chunk).includes("exiting...")) {
				promise.resolve();
			}
		};

		proc.stderr.on("data", listener);
		proc.kill("SIGINT");

		await promise;

		proc.stderr.off("data", listener);
	});
});
