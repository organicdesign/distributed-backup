import { ArgumentsCamelCase, Options, InferredOptionTypes, MiddlewareFunction } from "yargs";

export type Builder = Record<string, Options>
export type ToArgs<T extends Builder> = ArgumentsCamelCase<InferredOptionTypes<T>>
export type Handler<T extends Builder> = (argv: ToArgs<T>) => void | Promise<void>

export const createRawBuilder = <T extends Builder>(options: T): T => options;

const globalOptions = createRawBuilder({
	socket: {
		alias: "s",
		type: "string",
		describe: "The path to the daemon socket.",
		default: "/tmp/server.socket"
	}
});

export const createBuilder = <T extends Builder>(options: T): T & typeof globalOptions => ({
	...globalOptions,
	...options
});

export const createHandler = <T extends Builder>(
	handler: Handler<T & typeof globalOptions>
): Handler<T & typeof globalOptions> => handler;

export const createMiddleware = <T extends Builder>(
	handler: MiddlewareFunction<ToArgs<T & typeof globalOptions>>
): MiddlewareFunction => handler as MiddlewareFunction;
