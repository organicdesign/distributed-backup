import { toString as uint8ArrayToString } from "uint8arrays";
import type { Components } from "../utils.js";

export const name = "id";

export const method = (components: Components) => async () => {
	return uint8ArrayToString(components.welo.identity.id, "base58btc");
};
