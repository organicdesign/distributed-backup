import type Fuse from "@cocalc/fuse-native";

type Reverse<T extends readonly any[], U extends any[] = []> =
	T extends readonly [infer F, ...infer R] ? Reverse<R, [F, ...U]> : U

type At<T extends readonly any[], I extends number> =
	`${I}` extends `-${infer J}` ?
		[never, ...Reverse<T>] extends infer R ?
			J extends keyof R ?
				R[J] :
				undefined :
			never :
		T[I]

type DropLastItem<T extends unknown[]> = T extends [...infer U, any] ? U : []

type GetParams<T extends undefined | ((...args: any[]) => any)> = Parameters<NonNullable<T>>

type GetLastParam<T extends undefined | ((...args: any[]) => any)> = At<GetParams<T>, -1>

type NullToVoid<T> = T extends null | undefined ? void : T

type AugmentReturns<T extends Partial<Record<keyof Fuse.OPERATIONS, unknown>>> = {
	[P in keyof Fuse.OPERATIONS]: (...args: DropLastItem<GetParams<Fuse.OPERATIONS[P]>>) => Promise<T[P]>
}

type Override <T extends Record<string, unknown>, R extends Record<string, unknown>> = Omit<T, keyof R> & R;

export type FuseOpts = Override<
	{
		[P in keyof Fuse.OPERATIONS]:
			(...args: DropLastItem<GetParams<Fuse.OPERATIONS[P]>>) =>
				Promise<
					NullToVoid<At<
						GetParams<GetLastParam<Fuse.OPERATIONS[P]>>,
						1
					>>
				>
	},
	AugmentReturns<{
		readdir: { stats?: Fuse.Stats[], names: string[] }
		read: number | void
		write: number | void
		create: number | void
	}>
>
