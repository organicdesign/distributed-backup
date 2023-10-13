import { sha256 } from "multiformats/hashes/sha2";
import {  } from 'bip32';
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString, } from "uint8arrays";
import { keysPBM } from "@libp2p/crypto/keys";
import { peerIdFromKeys } from "@libp2p/peer-id";
import * as ecc from "tiny-secp256k1";
import { BIP32Factory, type BIP32Interface } from 'bip32';
import type { PeerId } from "@libp2p/interface-peer-id";

const KEY_SEPARATOR = "-";

export const bip32 = BIP32Factory(ecc);

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

export const encodeKey = (key: BIP32Interface): string => {
	if (key.privateKey == null) {
		throw new Error("key is missing private data");
	}

	const privateKey = uint8ArrayToString(key.privateKey, "base58btc");
	const chainCode = uint8ArrayToString(key.chainCode, "base58btc");

	return `${privateKey}${KEY_SEPARATOR}${chainCode}`
};

export const decodeKey = (key: string): BIP32Interface => {
	const [privateKey, chainCode] = key.split(KEY_SEPARATOR).map(s => uint8ArrayFromString(s, "base58btc"));

	return bip32.fromPrivateKey(Buffer.from(privateKey), Buffer.from(chainCode));
}
