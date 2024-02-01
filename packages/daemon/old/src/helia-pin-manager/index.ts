import setupSequelize from "./sequelize.js";
import { PinManager }  from "./pin-manager.js";
import type { Helia } from "@helia/interface";
import type { Options } from "sequelize";

export default async (helia: Helia, config: Partial<Pick<Options, "storage" | "database">> = {}) => {
	const components = await setupSequelize(config);

	return new PinManager({ ...components, helia });
};
