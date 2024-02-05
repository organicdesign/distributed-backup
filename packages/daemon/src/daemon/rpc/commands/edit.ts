import { z } from "zod";
import { CID } from "multiformats/cid";
import * as logger from "logger";
import { type Components, zCID, RevisionStrategies } from "../../interface.js";

export const name = "edit";

const Params = z.object({
	group: zCID,
	path: z.string(),
	priority: z.number().optional(),
	revisionStrategy: RevisionStrategies.optional()
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	if (params.revisionStrategy !== null) {
		logger.warn("local revision strategy has no effect");
	}

	await components.localSettings.set(CID.parse(params.group), params.path, {
		priority: params.priority,
		revisionStrategy: params.revisionStrategy
	});

	return params.path;
};
