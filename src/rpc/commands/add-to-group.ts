import { CID } from "multiformats/cid";
import type { Components } from "../../interface.js";

export const name = "add-to-group";

export const method = (components: Components) => async (params: { cid: string, group: string, replace?: string }) => {
	if (params.replace != null) {
		throw new Error("Replace is not implemented yet.");
	}

	const upload = await components.uploads.findOne({ where: { cid: params.cid }});

	if (upload == null) {
		throw new Error(`cannot find upload: ${params.cid}`);
	}

	await components.groups.addTo(CID.parse(params.group), {
		author: components.libp2p.peerId.toBytes(),
		cid: CID.parse(params.cid),
		encrypted: upload.encrypt,
		timestamp: Date.now(),
		links: []
	});
};
