import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { addBlock } from './blocks.js'
import * as dagPb from "@ipld/dag-pb";
import { compare as compareUint8Arrays } from "uint8arrays/compare"
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

export const createDag = async ({ blockstore }: { blockstore: Blockstore }, depth: number, children: number): Promise<CID[]> => {
	if (depth === 0) {
		const block = dagPb.encode({ Data: uint8arrayFromString(`level-${depth}-${Math.random()}`), Links: [] });
		const cid = await addBlock({ blockstore }, block, dagPb.code);

		return [cid];
	}

	const childrenNodes: CID[][] = [];

	for (let i = 0; i < children; i++) {
		childrenNodes.push(await createDag({ blockstore }, depth -1, children));
	}

	childrenNodes.sort((a, b) => compareUint8Arrays(a[0].bytes, b[0].bytes));

	const block = dagPb.encode({
		Data: uint8arrayFromString(`level-${depth}-${Math.random()}`),
		Links:childrenNodes.map(l => ({ Hash: l[0], Name: l[0].toString() }))
	});
	const cid = await addBlock({ blockstore }, block, dagPb.code);
	const allBlocks = childrenNodes.reduce((a, b) => [...a, ...b], []);

	allBlocks.unshift(cid);

	return allBlocks;
}
