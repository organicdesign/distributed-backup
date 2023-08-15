import * as add from "./commands/add.js";
import * as addresses from "./commands/addresses.js";
import * as connect from "./commands/connect.js";
import * as connections from "./commands/connections.js";
import * as createGroup from "./commands/create-group.js";
import * as id from "./commands/id.js";
import * as joinGroup from "./commands/join-group.js";
import * as listGroups from "./commands/list-groups.js";
import * as pubsub from "./commands/pubsub.js";
import * as queryGroup from "./commands/query-group.js";
import * as queryPins from "./commands/query-pins.js";
import type { Options } from "yargs";

export default [
	add,
	addresses,
	connect,
	connections,
	createGroup,
	id,
	joinGroup,
	listGroups,
	pubsub,
	queryGroup,
	queryPins
] as unknown as {
	desc: string,
	command: string,
	builder: Record<string, Options>,
	handler: (argc: Record<string, unknown>) => void | Promise<void>
}[];
