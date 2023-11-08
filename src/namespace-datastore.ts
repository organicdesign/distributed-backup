import { Datastore, Key, Query, Pair, KeyQuery } from "interface-datastore";
import map from "it-map";
import { NamespaceDatastore as BrokenNamespacedDatastore } from "datastore-core";
import type { AbortOptions } from 'interface-store'

// This whole file fixes an error in the NamespaceDatastore module:
// https://github.com/ipfs/js-stores/issues/236
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

		query.filters.unshift(({ key }) => this.iKey.isAncestorOf(key))

		return map(this.iChild.query(query, options), ({ key, value }) => {
			return {
				key: this.transform.invert(key),
				value
			}
		})
	}

	queryKeys (q: KeyQuery, options?: AbortOptions): AsyncIterable<Key> {
		const query = {
			...q
		}

		query.filters = (query.filters ?? []).map(filter => {
			return (key) => filter(this.transform.convert(key))
		})

		const { prefix } = q
		if (prefix != null && prefix !== '/') {
			delete query.prefix
			query.filters.push((key) => {
				return this.transform.invert(key).toString().startsWith(prefix)
			})
		}

		if (query.orders != null) {
			query.orders = query.orders.map(order => {
				return (a, b) => order(
					this.transform.invert(a),
					this.transform.invert(b)
				)
			})
		}

		query.filters.unshift(key => this.iKey.isAncestorOf(key))

		return map(this.iChild.queryKeys(query, options), key => {
			return this.transform.invert(key)
		})
	}
}
