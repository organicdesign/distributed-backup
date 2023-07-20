import * as add from "./commands/add.js";
import * as addresses from "./commands/addresses.js";
import * as connect from "./commands/connect.js";
import * as connections from "./commands/connections.js";
import * as createGroup from "./commands/create-group.js";
import * as id from "./commands/id.js";
import * as join from "./commands/join.js";
import * as pubsub from "./commands/pubsub.js";
import * as query from "./commands/query.js";
import type { Options } from "yargs";

export default [add, addresses, connect, connections, createGroup, id, join, pubsub, query] as unknown as {
	desc: string,
	command: string,
	builder: Record<string, Options>,
	handler: (argc: Record<string, unknown>) => void | Promise<void>
}[];
