import fs from "fs/promises";
import { Config } from "./interface.js";

export const getConfig = async (path: string): Promise<Config> => {
	const raw = await fs.readFile(path, { encoding: "utf8" });
	const json = JSON.parse(raw);

	const defaults: Config = {
		private: false,
		serverMode: false,
		validateInterval: 60 * 60,
		tickInterval: 10 * 60,
		storage: ":memory:",
		bootstrap: [],

		addresses: [
			"/ip4/127.0.0.1/tcp/0",
			"/ip4/127.0.0.1/tcp/0/ws"
		]
	};

	return Config.parse({ ...defaults, ...json });
};
