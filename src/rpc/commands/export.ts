import { exportFs } from "../../fs-exporter/index.js";
import { CID } from "multiformats/cid";
import type { Components } from "../../interface.js";

export const name = "export";

export const method = (components: Components) => async (params: { path: string, cid: string }) => {
	const reference = await components.references.findOne({ where: { cid: params.cid } });
	const upload = await components.uploads.findOne({ where: { cid: params.cid } });

	if (reference == null && upload == null) {
		throw new Error("Could not find CID");
	}

	const cid = CID.parse(params.cid);

	await exportFs(components, cid, params.path);
};
