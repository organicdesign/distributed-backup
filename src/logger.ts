import { logger } from "@libp2p/logger";

const APP_NAME = "backup";

const createLogger = (name: string) => {
	return logger(`${APP_NAME}:${name} [${new Date().toISOString()}]`);
};

export const lifecycle = createLogger("lifecycle");
export const tick = createLogger("tick");
export const add = createLogger("import");
export const validate = createLogger("validate");
export const references = createLogger("references");
export const pins = createLogger("pins");
export const groups = createLogger("groups");
export const uploads = createLogger("uploads");
export const downloads = createLogger("downloads");
export const debug = createLogger("debug");
