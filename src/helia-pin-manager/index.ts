import setupSequelize from "./sequelize.js";
import { PinManager }  from "./pin-manager.js";
import type { Helia } from "@helia/interface";

export default async (helia: Helia) => {
	const components = await setupSequelize();

	return new PinManager({ ...components, helia });
}
