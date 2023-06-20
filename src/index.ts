import createLibp2p from "./libp2p.js";
import createHelia from "./helia.js";
import { createWelo, Determine, Keyvalue } from "welo";

const libp2p = await createLibp2p();
const helia = await createHelia(libp2p);
const welo = await createWelo({ ipfs: helia });

const manifestConfig: Determine = {
	name: "test",
	access: {
		protocol: "/hldb/access/static",
		config: { write: [welo.identity.id] }
	}
};

const manifest = await welo.determine(manifestConfig);
const db = await welo.open(manifest);
const store = db.store as Keyvalue;

const op = store.creators.put("cid_str", { cid: "", path: "../" });

await db.replica.write(op);

const index = await store.latest();
console.log(await store.selectors.get(index)("cid_str"))
