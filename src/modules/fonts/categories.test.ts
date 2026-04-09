import { describe, expect, it } from "bun:test";

import {
	getCategoryForCodePoint,
	isInCategory,
} from "./categories";

import type { TGlyphCategory } from "Types";

describe("isInCategory", () => {
	it("is inclusive on range endpoints", () => {
		const cat: TGlyphCategory = {
			id: "test",
			name: "Test",
			description: "",
			ranges: [[10, 20]],
		};
		expect(isInCategory(10, cat)).toBe(true);
		expect(isInCategory(20, cat)).toBe(true);
		expect(isInCategory(9, cat)).toBe(false);
		expect(isInCategory(21, cat)).toBe(false);
	});
});

describe("getCategoryForCodePoint", () => {
	it("maps Basic Latin code points to basic-latin", () => {
		expect(getCategoryForCodePoint(0x41).id).toBe("basic-latin");
	});

	it("maps Cyrillic code points before unrelated later categories", () => {
		expect(getCategoryForCodePoint(0x0410).id).toBe("cyrillic");
	});

	it("maps emoji block code points to emoji", () => {
		expect(getCategoryForCodePoint(0x1f600).id).toBe("emoji");
	});

	it("falls back to other when no range matches", () => {
		expect(getCategoryForCodePoint(0xe000).id).toBe("other");
	});
});
