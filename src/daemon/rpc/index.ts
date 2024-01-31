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
import * as mkdir from "./commands/mkdir.js";
import * as queryGroup from "./commands/query-group.js";
import * as queryGroupDirs from "./commands/query-group-dirs.js";
import * as queryPins from "./commands/query-pins.js";
import * as pubsub from "./commands/pubsub.js";
import * as read from "./commands/read.js";
import * as revisions from "./commands/revisions.js";
import * as sync from "./commands/sync.js";
import * as write from "./commands/write.js";
import type { Components } from "../interface.js";

export default [
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
	mkdir,
	queryGroup,
	queryGroupDirs,
	queryPins,
	pubsub,
	read,
	revisions,
	sync,
	write
] as {
	name: string,
	method: (components: Components) => (params: Record<string, unknown>) => Promise<unknown> | unknown,
}[];
