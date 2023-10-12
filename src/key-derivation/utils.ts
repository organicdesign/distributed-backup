import { sha256 } from "multiformats/hashes/sha2";
import { fromString as uint8ArrayFromString } from "uint8arrays";

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
