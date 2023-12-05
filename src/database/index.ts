import { Sequelize, type Options } from "sequelize";
import { setupContent } from "./content.js";

export default async (options: Partial<Pick<Options, "storage" | "database">> = {}) => {
	const sequelize = new Sequelize( {
		dialect: "sqlite",
		storage: options.storage ?? ":memory:",
		database: options.database ?? "distributed-backup",
		logging: false
	});

	const content = setupContent(sequelize);

	await sequelize.sync();

	return { sequelize, content };
}
