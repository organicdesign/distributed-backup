import { Datastore, Key, Query, Pair } from "interface-datastore";
import map from "it-map";
import { NamespaceDatastore as BrokenNamespacedDatastore } from "datastore-core";
import type { AbortOptions } from 'interface-store'

export class NamespaceDatastore extends BrokenNamespacedDatastore {
	private readonly iChild: Datastore
	private readonly iKey: Key

	constructor (child: Datastore, key: Key) {
		super(child, key)

		this.iChild = child
		this.iKey = key;
	}

	query (q: Query, options?: AbortOptions): AsyncIterable<Pair> {
		const query: Query = {
			...q
		}

		//filter

		query.filters = (query.filters ?? []).map(filter => {
			return ({ key, value }) => filter({ key: this.transform.convert(key), value })
		})

		const { prefix } = q
		if (prefix != null && prefix !== '/') {
			delete query.prefix
			query.filters.push(({ key }) => {
				return this.transform.invert(key).toString().startsWith(prefix)
			})
		}

		if (query.orders != null) {
			query.orders = query.orders.map(order => {
				return (a, b) => order(
					{ key: this.transform.invert(a.key), value: a.value },
					{ key: this.transform.invert(b.key), value: b.value }
				)
			})
		}

		query.filters.push(pair => this.iKey.isAncestorOf(pair.key))

		return map(this.iChild.query(query, options), ({ key, value }) => {
			return {
				key: this.transform.invert(key),
				value
			}
		})
	}
}
