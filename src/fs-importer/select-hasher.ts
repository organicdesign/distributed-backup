import { sha256, sha512 } from "multiformats/hashes/sha2";
import * as blake2b from "@multiformats/blake2/blake2b";
import * as blake2s from "@multiformats/blake2/blake2s";
import type { Hasher } from "multiformats/hashes/hasher";

const getHasher = (types: Record<string, Hasher<string, number>>, prefix: string, size?: string): Hasher<string, number> => {
	if (size == null) {
		throw new Error("invalid size");
	}

	if (types[`${prefix}${size}`] == null) {
		throw new Error("invalid size");
	}

	return types[`${prefix}${size}`];
};

export default (hasher?: string): Hasher<string, number> => {
	if (hasher == null) {
		return sha256;
	}

	switch (hasher) {
		case "sha2-256":
			return sha256;

		case "sha2-512":
			return sha512;
	}

	const parts = hasher.split("-");

	switch (parts[0]) {
		case "blake2b":
			return getHasher(blake2b, "blake2b", parts[1]);

		case "blake2s":
			return getHasher(blake2s, "blake2s", parts[1]);
	}

	throw new Error("invalid hasher");
};
