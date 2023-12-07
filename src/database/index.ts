import { Sequelize, type Options } from "sequelize";

export default async (options: Partial<Pick<Options, "storage" | "database">> = {}) => {
	const sequelize = new Sequelize( {
		dialect: "sqlite",
		storage: options.storage ?? ":memory:",
		database: options.database ?? "distributed-backup",
		logging: false
	});

	await sequelize.sync();

	return { sequelize };
}
