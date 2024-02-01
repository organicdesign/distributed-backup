import Path from "path";
import fs from "fs/promises";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { DeferredPromise } from "@open-draft/deferred-promise";
import { toString as uint8ArrayToString } from "uint8arrays";
import { generateKeyFile } from "../../../src/key-manager/utils.js";
import { projectPath } from "../../../src/daemon/utils.js";

const mnemonic = "result dune cream slogan oil sock seminar either strong girl athlete jacket";

const tsNode = Path.join(projectPath, "node_modules/ts-node/dist/bin.js");

export default async (name: string) => {
	const keyPath = Path.join(projectPath, `test/${name}.key`);
	const socket = Path.join(projectPath, `test/${name}.socket`);

	await generateKeyFile(keyPath, mnemonic, name);

	const args = [
		Path.join(projectPath, "src/daemon/index.ts"),
		"-k", keyPath,
		"-c", Path.join(projectPath, "test/e2e/utils/config.json"),
		"-s", socket
	];

	let proc: ChildProcessWithoutNullStreams;

	const forceQuit = async () => {
		// Ensure it is really dead.
		proc.kill(9);

		await Promise.allSettled([
			fs.rm(socket),
			fs.rm(keyPath)
		]);
	};

	return {
		async start () {
			proc = spawn(tsNode, args, { env: { ...process.env, DEBUG: "backup:*" } });

			const promise: DeferredPromise<void> = new DeferredPromise();

			const listener = (chunk: Uint8Array) => {
				if (uint8ArrayToString(chunk).includes("started")) {
					promise.resolve();
				}
			};

			proc.stderr.on("data", listener);

			await promise;

			proc.stderr.off("data", listener);
		},

		async stop () {
			const promise: DeferredPromise<void> = new DeferredPromise();

			const listener = (chunk: Uint8Array) => {
				if (uint8ArrayToString(chunk).includes("exiting...")) {
					promise.resolve();
				}
			};

			proc.stderr.on("data", listener);
			proc.kill("SIGINT");

			// Kill it if it fails to do it cleanly.
			setTimeout(async () => {
				await forceQuit();
				promise.reject(new Error("process did not exit cleanly"));
			}, 3000);

			await promise;

			proc.stderr.off("data", listener);

			// Make sure things are cleaned up.
			await forceQuit();
		}
	};
};
