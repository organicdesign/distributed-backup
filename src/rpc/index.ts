import * as connect from "./commands/connect.js";

export default [connect] as unknown as {
	name: string,
	method: () => () => Promise<unknown> | unknown,
}[];
