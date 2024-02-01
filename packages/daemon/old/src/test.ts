import ir from "./fs-import-export/import-recursive.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import { sha256 } from "multiformats/hashes/sha2";
import { fixedSize } from "ipfs-unixfs-importer/chunker";

const blockstore = new BlackHoleBlockstore();
const path = "/home/saul/Projects/distributed-backup/src";
/*
for await (const r of ir(blockstore, path, { hasher: sha256, chunker: fixedSize(), cidVersion: 1 })) {
	console.log(r);
}
*/
import Path from "path";

console.log(Path.join("/", "test", "/"));
