import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { addBlock } from './blocks.js'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

export interface DAGNode {
	cid: CID
	level: number
	links: CID[]
}

export async function createDag ({ blockstore }: { blockstore: Blockstore }, depth: number, children: number): Promise<Record<string, DAGNode>> {
	const dag: Record<string, DAGNode> = {};
	const root = await addBlock({ blockstore }, uint8arrayFromString('level-0'));

	await addChildren(root, 'level', 0, 0, depth, children, dag, { blockstore });

	return dag;
}

async function addChildren (cid: CID, name: string, level: number, index: number, depth: number, children: number, dag: Record<string, DAGNode>, { blockstore }: { blockstore: Blockstore }): Promise<void> {
	if (depth === 0) {
		return;
	}

	name = `${name}-${index}`;

	dag[name] = {
		level,
		cid,
		links: []
	};

	for (let i = 0; i < children; i++) {
		const subChild = await addBlock({ blockstore }, uint8arrayFromString(`${name}-${i}`));

		dag[name].links.push(subChild);

		await addChildren(subChild, name, level + 1, index + i, depth - 1, children, dag, { blockstore });
	}
};
