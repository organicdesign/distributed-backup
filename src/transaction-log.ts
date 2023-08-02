import { Datastore, Key } from "interface-datastore";
import { DeferredPromise } from "@open-draft/deferred-promise";
import { encodeAny, decodeAny } from "./utils.js";
import type { Startable } from "@libp2p/interfaces/startable";

interface Action {
	id: number
	key: Uint8Array
	value?: Uint8Array
}

class Transaction {
	private readonly actions: Action[] = [];
	private readonly datastores: Datastore[];

	constructor (datastores: Datastore[]) {
		this.datastores = datastores;
	}

	get data (): Action[] {
		return [...this.actions];
	}

	put (datastore: Datastore, key: Key, value: Uint8Array) {
		this.addAction(datastore, key, value);
	}

	delete (datastore: Datastore, key: Key) {
		this.addAction(datastore, key);
	}

	private addAction (datastore: Datastore, key: Key, value?: Uint8Array) {
		const id = this.getDsId(datastore);

		this.actions.push({
			id,
			key: key.uint8Array(),
			value
		});
	}

	private getDsId (datastore: Datastore) {
		const dsId = this.datastores.indexOf(datastore);

		if (dsId < 0) {
			throw new Error("invalid datastore")
		}

		return dsId;
	}
}

export class TransactionLog implements Startable {
	private readonly queue: { resolver?: () => void, transaction: Action[] }[] = [];
	private readonly datastores: Datastore[];
	private readonly datastore: Datastore;
	private started = false;
	private running = false;

	constructor (datastore: Datastore, datastores: Datastore[]) {
		this.datastores = datastores;
		this.datastore = datastore;
	}

	isStarted () {
		return this.started;
	}

	async start () {
		if (this.started) {
			return;
		}

		try {
			const rawLog = await this.datastore.get(new Key("log"));
			const transactions = decodeAny<Action[][]>(rawLog);

			for (const transaction of transactions) {
				this.queue.push({ transaction });
			}
		} catch (error) {}

		let rollback: Action[] | undefined = undefined;

		try {
			const rawRollback = await this.datastore.get(new Key("rollback"));
			rollback = decodeAny<Action[]>(rawRollback);
		} catch (error) {}

		if (rollback != null) {
			await Promise.all(rollback.map(a => this.applyAction(a)));
		}

		this.started = true;
	}

	async stop () {
		if (!this.started) {
			return;
		}

		this.started = false;
	}

	create (): Transaction {
		return new Transaction(this.datastores);
	}

	async commit (transaction: Transaction) {
		if (!this.started) {
			throw new Error("not started");
		}

		const promise = new DeferredPromise<void>();

		this.queue.push({
			transaction: transaction.data,
			resolver: () => promise.resolve()
		});

		await this.save();

		this.run();

		await promise;
	}

	private async run () {
		if (this.running) {
			return;
		}

		this.running = true;

		while (this.queue.length !== 0) {
			const item = this.queue.shift();

			if (item == null) {
				break;
			}
			await this.commitTransaction(item.transaction);
			item.resolver?.();

			// Update the saved log.
			await this.save();
		}

		this.running = false;
	}

	private async commitTransaction (transaction: Action[]) {
		// Generate the list of actions needed to undo this transaction.
		const rollbackValues: Action[] = await Promise.all(transaction.map(async action => {
			const datastore = this.datastores[action.id];
			let value: Uint8Array | undefined = undefined;

			try {
				value = await datastore.get(new Key(action.key));
			} catch (error) {}

			return {
				id: action.id,
				key: action.key,
				value
			};
		}));

		await this.datastore.put(new Key("rollback"), encodeAny(rollbackValues));

		const promises = transaction.map(a => this.applyAction(a));

		try {
			await Promise.all(promises);
		} catch (error) {
			await Promise.allSettled(promises);
			// If this fails then it is a catastrophic failure.
			await Promise.all(rollbackValues.map(a => this.applyAction(a)));
		}

		// Be sure to nuke the rollback data if we were successful.
		await this.datastore.delete(new Key("rollback"));
	}

	private async applyAction (action: Action) {
		const datastore = this.datastores[action.id];
		const key = new Key(action.key);

		if (action.value === undefined) {
			await datastore.delete(key);
		} else {
			await datastore.put(key, action.value);
		}
	}

	private async save () {
		const transactions = this.queue.map(({ transaction }) => transaction);

		await this.datastore.put(new Key("log"), encodeAny(transactions));
	}
}
