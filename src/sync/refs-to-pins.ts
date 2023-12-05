import { Op } from "sequelize";
import type { Components } from "../interface.js";

export const refsToPins = async (components: Components) => {
	const refs = await components.content.findAll({
		where: {
			[Op.or]: [
				{ state: "DOWNLOADING" },
				{ state: "DESTROYED" }
			]
		}
	});

	const downloading = refs.filter(r => r.state === "DOWNLOADING");
	const destoyed = refs.filter(r => r.state === "DESTROYED");

	await Promise.all(downloading.map(async ref => {
		await components.pinManager.pin(ref.cid);

		ref.state = "COMPLETED";

		await ref.save();
	}));

	await Promise.all(destoyed.map(async ref => {
		try {
			await components.pinManager.unpin(ref.cid);
		} catch (error) {
			if ((error as Error)["code"] !== "ERR_NOT_FOUND") {
				throw error;
			}
		}
		await ref.destroy();
	}));
};
