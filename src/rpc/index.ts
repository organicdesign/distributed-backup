import * as connect from "./commands/connect.js";
import type { Components } from "./utils.js";

export default [connect] as unknown as {
	name: string,
	method: (components: Components) => () => Promise<unknown> | unknown,
}[];
