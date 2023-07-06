import { logger } from "@libp2p/logger";

const appName = "backup";

export const tick = logger(`${appName}:tick`);
export const add = logger(`${appName}:add`);
