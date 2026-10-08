import { describe, expect, it } from "bun:test";
import { create, Font } from "fontkit";
import { readFileSync } from "node:fs";

import type { HbExports } from "./subset";
import { subset } from "./subset";

const wasmBytes = readFileSync(
	Bun.resolveSync("harfbuzzjs/hb-subset.wasm", import.meta.dir)
);

let hbPromise: Promise<HbExports> | null = null;

const getHb = (): Promise<HbExports> => {
	hbPromise ??= WebAssembly.instantiate(wasmBytes).then(
		({ instance }) => instance.exports as unknown as HbExports
	);
	return hbPromise;
};

const fontBytes = readFileSync(
	new URL("../../glyph/fonts/PT-Root-UI_VF.woff2", import.meta.url)
);

const woffBytes = readFileSync(
	new URL("../../glyph/fonts/PT-Root-UI_VF.woff", import.meta.url)
);

const toArrayBuffer = (bytes: Buffer): ArrayBuffer =>
	bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength
	) as ArrayBuffer;

const parseFont = (data: Uint8Array | Buffer): Font => {
	const font = create(Buffer.from(data));
	if ("fonts" in font) throw new Error("Expected a single font");
	return font;
};

const LICENSE_KEYS = [
	"copyright",
	"trademark",
	"manufacturer",
	"designer",
	"description",
	"vendorURL",
	"designerURL",
	"license",
	"licenseURL",
] as const;

const expectLicenseRecordsKept = (original: Font, subsetFont: Font): void => {
	for (const key of LICENSE_KEYS) {
		const originalValue = original.getName(key, "en");
		expect(originalValue).not.toBeNull();
		expect(subsetFont.getName(key, "en")).toBe(originalValue);
	}
};

describe("subset", () => {
	it("keeps licensing name records from WOFF2 input", async () => {
		const hb = await getHb();
		const original = parseFont(fontBytes);
		const subsetFont = parseFont(
			await subset(hb, toArrayBuffer(fontBytes), [0x41, 0x42])
		);

		expectLicenseRecordsKept(original, subsetFont);
	});

	it("keeps licensing name records from WOFF input", async () => {
		const hb = await getHb();
		const original = parseFont(woffBytes);
		const subsetFont = parseFont(
			await subset(hb, toArrayBuffer(woffBytes), [0x41, 0x42])
		);

		expectLicenseRecordsKept(original, subsetFont);
	});

	it("keeps font identity name records", async () => {
		const hb = await getHb();
		const original = parseFont(fontBytes);
		const subsetFont = parseFont(
			await subset(hb, toArrayBuffer(fontBytes), [0x41])
		);

		for (const key of ["fontFamily", "fullName", "postscriptName"] as const) {
			const originalValue = original.getName(key, "en");
			expect(originalValue).not.toBeNull();
			expect(subsetFont.getName(key, "en")).toBe(originalValue);
		}
	});
});
