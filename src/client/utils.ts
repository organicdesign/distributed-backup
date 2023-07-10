import { ArgumentsCamelCase, Options, InferredOptionTypes } from "yargs";

export type Builder = Record<string, Options>
export type Handler<T extends Builder> = (argv: ArgumentsCamelCase<InferredOptionTypes<T>>) => void | Promise<void>

export const createRawBuilder = <T extends Record<string, Options>>(options: T): T => options;

const globalOptions = createRawBuilder({
	socket: {
		alias: "s",
		type: "string",
		describe: "The path to the daemon socket."
	}
});

export const createBuilder = <T extends Record<string, Options>>(options: T): T & typeof globalOptions => ({
	...globalOptions,
	...options
});

export const createHandler = <T extends Record<string, Options>>(
	handler: (argv: ArgumentsCamelCase<InferredOptionTypes<T>>) => void | Promise<void>
) => handler;
