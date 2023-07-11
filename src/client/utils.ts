import { ArgumentsCamelCase, Options, InferredOptionTypes, MiddlewareFunction } from "yargs";

export type Builder = Record<string, Options>
export type ToArgs<T extends Builder> = ArgumentsCamelCase<InferredOptionTypes<T & typeof globalOptions>>
export type Handler<T extends Builder> = (argv: ToArgs<T>) => void | Promise<void>
export type Middleware<T extends Builder> = MiddlewareFunction<ToArgs<T>>

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
	handler: Handler<T>
): Handler<T> => handler;

export const createMiddleware = <T extends Builder>(
	handler: Middleware<T>
): MiddlewareFunction => handler as MiddlewareFunction;
