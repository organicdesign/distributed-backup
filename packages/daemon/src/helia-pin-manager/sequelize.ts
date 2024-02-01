import { Sequelize, type Options, Transaction } from "sequelize";
import { setupBlocks } from "./blocks.js";
import { setupDownloads } from "./downloads.js";
import { setupPins } from "./pins.js";

export default async (options: Partial<Pick<Options, "storage" | "database">> = {}) => {
	const sequelize = new Sequelize( {
		dialect: "sqlite",
		storage: options.storage ?? ":memory:",
		database: options.database ?? "pins",
		logging: false,
		transactionType: Transaction.TYPES.IMMEDIATE // Fixes database is locked errors.
	});

	const blocks = setupBlocks(sequelize);
	const downloads = setupDownloads(sequelize);
	const pins = setupPins(sequelize);

	await sequelize.sync();

	return { sequelize, blocks, downloads, pins };
}
