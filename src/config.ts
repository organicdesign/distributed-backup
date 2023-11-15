import fs from "fs/promises";
import type { Config } from "./interface.js";

export const getConfig = async (path: string): Promise<Config> => {
	const raw = await fs.readFile(path, { encoding: "utf8" });
	const json = JSON.parse(raw);

	const config: Config = {
		private: json.private ?? false,
		validateInterval: json.validateInterval ?? 60 * 60,
		tickInterval: json.tickInterval ?? 10 * 60,
		storage: json.storage ?? ":memory:",
		addresses: json.addresses ?? [
			"/ip4/127.0.0.1/tcp/0",
			"/ip4/127.0.0.1/tcp/0/ws"
		],
		bootstrap: json.bootstrap ?? []
	};

	return config;
};
