import { Chunker, fixedSize, rabin } from "ipfs-unixfs-importer/chunker";

const parseNumber = (input?: string): number | null => {
	if (input == null) {
		return null;
	}

	return isNaN(+input) ? null : +input;
};

export default (chunker?: string): Chunker => {
	if (chunker == null) {
		return fixedSize();
	}

	const parts = chunker.split("-");

	if (parts.length === 0) {
		return fixedSize();
	}

	if (parts[0] === "size") {
		const chunkSize = parseNumber(parts[1]) ?? 262144;

		return fixedSize({ chunkSize });
	}

	if (parts[0] === "rabin") {
		const minChunkSize = parseNumber(parts[1]) ?? 262144;
		const avgChunkSize = parseNumber(parts[2]) ?? 262144;
		const maxChunkSize = parseNumber(parts[3]) ?? 262144;

		return rabin({ maxChunkSize, minChunkSize, avgChunkSize });
	}

	throw new Error("invalid chunker");
};
