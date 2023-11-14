import fs from "fs/promises";
import Path from "path";
import { projectPath } from "./utils.js";
import type { Config } from "./interface.js";

export const getConfig = async (): Promise<Config> => {
	const raw = await fs.readFile(Path.join(projectPath, "config/config.json"), { encoding: "utf8" });
	const json = JSON.parse(raw);

	const config: Config = {
		validateInterval: json.validateInterval ?? 60 * 60,
		tickInterval: json.tickInterval ?? 10 * 60,
		storage: json.storage ?? ":memory:",
		addresses: json.addresses ?? [ { address: "127.0.0.1", port: 0 } ]
	};

	return config;
};
