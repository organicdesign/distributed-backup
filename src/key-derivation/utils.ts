import { sha256 } from "multiformats/hashes/sha2";
import { fromString as uint8ArrayFromString } from "uint8arrays";
import { keysPBM } from "@libp2p/crypto/keys";
import { peerIdFromKeys } from "@libp2p/peer-id";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { BIP32Interface } from 'bip32';

export const nameToPath = async (name: string, hardened: boolean = true): Promise<string> => {
	const hash = await sha256.digest(uint8ArrayFromString(name));
	const numbers: number[] = [];
	const chunkSize = 16 / 8;

	for (let i = 0; i < hash.digest.length / chunkSize; i ++) {
		numbers.push(
			Buffer.from(hash.bytes.slice(i * chunkSize , (i + 1) * chunkSize)).readUInt16LE()
			+ (hardened ? 0x80000000 : 0)
		);
	}

	return `m/${numbers.join("/")}`;
};

export const keyToPeerId = async (key: BIP32Interface): Promise<PeerId> => {
	const marshaledPublicKey = keysPBM.PublicKey.encode({
		Type: keysPBM.KeyType.Secp256k1,
		Data: key.publicKey
	});

	const marshaledPrivateKey = keysPBM.PrivateKey.encode({
		Type: keysPBM.KeyType.Secp256k1,
		Data: key.privateKey
	});

	return await peerIdFromKeys(marshaledPublicKey, marshaledPrivateKey);
};
