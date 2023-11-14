import { Sequelize, type Options } from "sequelize";
import { setupLocalContent } from "./localContent.js";
import { setupRemoteContent } from "./remoteContent.js";

export default async (options: Partial<Pick<Options, "storage" | "database">> = {}) => {
	const sequelize = new Sequelize( {
		dialect: "sqlite",
		storage: options.storage ?? ":memory:",
		database: options.database ?? "distributed-backup",
		logging: false
	});

	const localContent = setupLocalContent(sequelize);
	const remoteContent = setupRemoteContent(sequelize);

	await sequelize.sync();

	return { sequelize, localContent, remoteContent };
}
