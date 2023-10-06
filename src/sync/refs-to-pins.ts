import { Op } from "sequelize";
import type { Components } from "../interface.js";

export const refsToPins = async (components: Components) => {
	const refs = await components.references.findAll({
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
		await components.dm.pin(ref.cid);

		ref.state = "DOWNLOADED";

		await ref.save();
	}));

	await Promise.all(destoyed.map(async ref => {
		const { count } = await components.pins.findAndCountAll({
			where: { cid: ref.cid.toString() }
		});

		if (count <= 1) {
			await components.dm.unpin(ref.cid);
		}

		await ref.destroy();
	}));
};
