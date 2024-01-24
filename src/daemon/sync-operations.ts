import { CID } from "multiformats/cid";
import { OperationManager } from "./operation-manager.js";
import { Components } from "./interface.js";

export default async (components: Pick<Components, "stores" | "pinManager"| "groups">) => {
	const om = new OperationManager(components.stores.get("sync-operations"), {
		put: async (groupData: Uint8Array, path: string, rawEntry: Uint8Array) => {
			const group = CID.decode(groupData);

			await components.pinManager.process(group, path, rawEntry);
		}
	});

	await om.start();

	return om;
};
