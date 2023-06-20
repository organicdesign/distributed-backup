import { createHelia } from "helia";
import type { Libp2p, ServiceMap } from "@libp2p/interface-libp2p";

export default async <T extends ServiceMap>(libp2p: Libp2p<T>) => await createHelia({ libp2p });
