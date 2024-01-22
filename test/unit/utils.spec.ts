import assert from "assert/strict";
import { MEMORY_MAGIC } from "../../src/interface.js";
import { isMemory } from "../../src/utils.js";

describe("isMemory", () => {
	it("returns true if the memory magic is passed", () => {
		assert(isMemory(MEMORY_MAGIC));
	});

	it("returns false for any other value than the memory magic", () => {
		const values = [
			"/my/path",
			"my-directory",
			":memory",
			"memory",
			"memory:",
			":memory:/my-dir"
		];

		for (const value of values) {
			assert(!isMemory(value));
		}
	});
});
