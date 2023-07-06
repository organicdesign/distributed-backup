import { logger } from "@libp2p/logger";

const APP_NAME = "backup";

const createLogger = (name: string) => {
	return logger(`${APP_NAME}:${name}`);
};

export const tick = createLogger("tick");
export const add = createLogger("import");
export const validate = createLogger("validate");
