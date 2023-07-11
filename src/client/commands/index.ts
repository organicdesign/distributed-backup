import * as add from "./add.js";
import * as query from "./query.js";
import type { Options } from "yargs";

export default [add, query] as unknown as {
	desc: string,
	command: string,
	builder: Record<string, Options>,
	handler: (argc: Record<string, unknown>) => void | Promise<void>
}[];
