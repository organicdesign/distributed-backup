import fs from "fs/promises";
import Path from "path";
import { srcPath } from "./utils.js";

export interface Config {
	validateInterval: number
	tickInterval: number
}

export const getConfig = async (): Promise<Config> => {
	const raw = await fs.readFile(Path.join(srcPath, "config/config.json"), { encoding: "utf8" });
	const json = JSON.parse(raw);

	const config: Config = {
		validateInterval: json.validateInterval ?? 60 * 60,
		tickInterval: json.tickInterval ?? 10 * 60
	};

	return config;
};
