import * as add from "./add.js";
import * as query from "./query.js";
import * as id from "./id.js";
import * as address from "./address.js";
import * as connect from "./connect.js";
import type { Options } from "yargs";

export default [add, query, id, address, connect] as unknown as {
	desc: string,
	command: string,
	builder: Record<string, Options>,
	handler: (argc: Record<string, unknown>) => void | Promise<void>
}[];
