import * as add from "./commands/add.js";
import * as addresses from "./commands/addresses.js";
import * as connect from "./commands/connect.js";
import * as connections from "./commands/connections.js";
import * as createGroup from "./commands/create-group.js";
import * as del from "./commands/delete.js";
import * as edit from "./commands/edit.js";
import * as exportData from "./commands/export.js";
import * as id from "./commands/id.js";
import * as joinGroup from "./commands/join-group.js";
import * as listGroups from "./commands/list-groups.js";
import * as listHeliaPins from "./commands/list-helia-pins.js";
import * as listUploads from "./commands/list-uploads.js";
import * as list from "./commands/list.js";
import * as pubsub from "./commands/pubsub.js";
import * as queryGroup from "./commands/query-group.js";
import * as queryPins from "./commands/query-pins.js";
import * as sync from "./commands/sync.js";
import type { Options } from "yargs";

const commands = [
	add,
	addresses,
	connect,
	connections,
	createGroup,
	del,
	edit,
	exportData,
	id,
	joinGroup,
	listGroups,
	listHeliaPins,
	listUploads,
	list,
	pubsub,
	queryGroup,
	queryPins,
	sync
] as unknown as {
	desc: string,
	command: string,
	builder: Record<string, Options>,
	handler: (argc: Record<string, unknown>) => string | Promise<string>
}[];

export default commands.map(c => ({...c, handler: async (argc: Record<string, unknown>) => {
	const result = await c.handler(argc);

	console.log(result);
}}));