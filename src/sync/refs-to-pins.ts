import type { Components } from "../interface.js";

const addPins = async (components: Components) => {
	const refs = await components.references.findAll({ where: { state: "DOWNLOADING" } });

	await Promise.all(refs.map(async ref => {
		await components.dm.pin(ref.cid);

		ref.state = "DOWNLOADED";

		await ref.save();
	}));
};

const removePins = async (components: Components) => {
	const refs = await components.references.findAll({ where: { state: "DESTROYED" } });

	await Promise.all(refs.map(async ref => {
		const { count } = await components.pins.findAndCountAll({ where: { cid: ref.cid.toString() } });

		if (count <= 1) {
			await components.dm.unpin(ref.cid);
			await ref.destroy();
		}
	}));
};

export const refsToPins = async (components: Components) => {
	await Promise.all([
		addPins(components),
		removePins(components)
	]);
};
