import Path from "path";
import { promisify } from "util";
import { execFile as execFileCb } from "child_process";
import { projectPath } from "../../../src/daemon/utils.js";

const execFile = promisify(execFileCb);

const tsNode = Path.join(projectPath, "node_modules/ts-node/dist/bin.js");

export default async (name: string, command: string, ...args: string[]): Promise<any> => {
	const socketArgs = [
		Path.join(projectPath, "src/client/index.ts"),
		"-s", Path.join(projectPath, `test/${name}.socket`),
		"--json", "true"
	];

	const run = async (...args: string[]) => await execFile(tsNode, [...socketArgs, ...args]);

	const { stdout } = await run(command, ...args);

	try {
		return JSON.parse(stdout);
	} catch (error) {
		throw new Error(`invalid json: ${stdout}`);
	}
};
