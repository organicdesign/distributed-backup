import * as add from "./add.js";
import * as query from "./query.js";
import * as id from "./id.js";
import * as addresses from "./addresses.js";
import * as connect from "./connect.js";
import * as connections from "./connections.js";
import * as pubsub from "./pubsub.js";
import * as join from "./join.js";
import type { Options } from "yargs";

export default [add, query, id, addresses, connect, connections, pubsub, join] as unknown as {
	desc: string,
	command: string,
	builder: Record<string, Options>,
	handler: (argc: Record<string, unknown>) => void | Promise<void>
}[];
