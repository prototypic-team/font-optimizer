export type HbExports = {
	memory: WebAssembly.Memory;
	malloc: (size: number) => number;
	free: (ptr: number) => void;
	hb_blob_create: (
		data: number,
		length: number,
		mode: number,
		userData: number,
		destroy: number
	) => number;
	hb_blob_destroy: (blob: number) => void;
	hb_blob_get_data: (blob: number, length: number) => number;
	hb_blob_get_length: (blob: number) => number;
	hb_face_create: (blob: number, index: number) => number;
	hb_face_destroy: (face: number) => void;
	hb_face_reference_blob: (face: number) => number;
	hb_subset_input_create_or_fail: () => number;
	hb_subset_input_destroy: (input: number) => void;
	hb_subset_input_unicode_set: (input: number) => number;
	hb_subset_input_set: (input: number, setType: number) => number;
	hb_set_add: (set: number, value: number) => void;
	hb_set_clear: (set: number) => void;
	hb_set_invert: (set: number) => void;
	hb_subset_or_fail: (face: number, input: number) => number;
};

export const WOFF_SIGNATURE = 0x774f4646; // 'wOFF'
const WOFF2_SIGNATURE = 0x774f4632; // 'wOF2'

// Copyright, trademark, manufacturer, designer, description, vendor and
// designer URLs, license description and license URL.
const LICENSE_NAME_IDS = [0, 7, 8, 9, 10, 11, 12, 13, 14];

const detectFormat = (buffer: ArrayBuffer): "sfnt" | "woff" | "woff2" => {
	const view = new DataView(buffer);
	const sig = view.getUint32(0);
	if (sig === WOFF_SIGNATURE) return "woff";
	if (sig === WOFF2_SIGNATURE) return "woff2";
	return "sfnt";
};

const decompressWoff = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
	const view = new DataView(buffer);
	const numTables = view.getUint16(12);
	const totalSfntSize = view.getUint32(16);

	const sfnt = new ArrayBuffer(totalSfntSize);
	const sfntView = new DataView(sfnt);
	const sfntBytes = new Uint8Array(sfnt);

	sfntView.setUint32(0, view.getUint32(4)); // sfnt flavor
	sfntView.setUint16(4, numTables);

	let searchRange = 1;
	let entrySelector = 0;
	while (searchRange * 2 <= numTables) {
		searchRange *= 2;
		entrySelector++;
	}
	searchRange *= 16;
	sfntView.setUint16(6, searchRange);
	sfntView.setUint16(8, entrySelector);
	sfntView.setUint16(10, numTables * 16 - searchRange);

	const tableRecordOffset = 12;
	const woffTableOffset = 44;
	let sfntDataOffset = (tableRecordOffset + numTables * 16 + 3) & ~3;

	for (let i = 0; i < numTables; i++) {
		const woff = woffTableOffset + i * 20;
		const tag = view.getUint32(woff);
		const offset = view.getUint32(woff + 4);
		const compLength = view.getUint32(woff + 8);
		const origLength = view.getUint32(woff + 12);

		const rec = tableRecordOffset + i * 16;
		sfntView.setUint32(rec, tag);
		sfntView.setUint32(rec + 4, view.getUint32(woff + 16)); // checksum
		sfntView.setUint32(rec + 8, sfntDataOffset);
		sfntView.setUint32(rec + 12, origLength);

		if (compLength < origLength) {
			const compressed = new Uint8Array(buffer, offset, compLength);
			const ds = new DecompressionStream("deflate");
			const writer = ds.writable.getWriter();
			writer.write(compressed);
			writer.close();
			const decompressed = await new Response(ds.readable).arrayBuffer();
			sfntBytes.set(new Uint8Array(decompressed), sfntDataOffset);
		} else {
			sfntBytes.set(new Uint8Array(buffer, offset, origLength), sfntDataOffset);
		}

		sfntDataOffset = (sfntDataOffset + origLength + 3) & ~3;
	}

	return sfnt;
};

const decompressWoff2 = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
	const { default: decompress } = await import("woff2-encoder/decompress");
	const result = await decompress(buffer);
	return result.buffer as ArrayBuffer;
};

const toSfnt = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
	const format = detectFormat(buffer);
	if (format === "woff") return decompressWoff(buffer);
	if (format === "woff2") return decompressWoff2(buffer);
	return buffer;
};

export const subset = async (
	hb: HbExports,
	fontBuffer: ArrayBuffer,
	codePoints: number[]
): Promise<Uint8Array> => {
	const sfntBuffer = await toSfnt(fontBuffer);

	const fontPtr = hb.malloc(sfntBuffer.byteLength);
	new Uint8Array(hb.memory.buffer).set(new Uint8Array(sfntBuffer), fontPtr);

	const blob = hb.hb_blob_create(
		fontPtr,
		sfntBuffer.byteLength,
		2 /* HB_MEMORY_MODE_WRITABLE */,
		0,
		0
	);
	const face = hb.hb_face_create(blob, 0);
	hb.hb_blob_destroy(blob);

	const input = hb.hb_subset_input_create_or_fail();
	if (input === 0) {
		hb.hb_face_destroy(face);
		hb.free(fontPtr);
		throw new Error("Failed to create subset input");
	}

	// Keep all OpenType layout features
	const layoutFeatures = hb.hb_subset_input_set(
		input,
		6 /* HB_SUBSET_SETS_LAYOUT_FEATURE_TAG */
	);
	hb.hb_set_clear(layoutFeatures);
	hb.hb_set_invert(layoutFeatures);

	// Keep licensing-related name records
	const nameIds = hb.hb_subset_input_set(
		input,
		4 /* HB_SUBSET_SETS_NAME_ID */
	);
	for (const id of LICENSE_NAME_IDS) {
		hb.hb_set_add(nameIds, id);
	}

	// HarfBuzz defaults to keeping en-US name records only
	const nameLangIds = hb.hb_subset_input_set(
		input,
		5 /* HB_SUBSET_SETS_NAME_LANG_ID */
	);
	hb.hb_set_clear(nameLangIds);
	hb.hb_set_invert(nameLangIds);

	const unicodeSet = hb.hb_subset_input_unicode_set(input);
	for (const cp of codePoints) {
		hb.hb_set_add(unicodeSet, cp);
	}

	const subsetFace = hb.hb_subset_or_fail(face, input);
	hb.hb_subset_input_destroy(input);

	if (subsetFace === 0) {
		hb.hb_face_destroy(face);
		hb.free(fontPtr);
		throw new Error("Subsetting failed");
	}

	const resultBlob = hb.hb_face_reference_blob(subsetFace);
	const offset = hb.hb_blob_get_data(resultBlob, 0);
	const length = hb.hb_blob_get_length(resultBlob);

	if (length === 0) {
		hb.hb_blob_destroy(resultBlob);
		hb.hb_face_destroy(subsetFace);
		hb.hb_face_destroy(face);
		hb.free(fontPtr);
		throw new Error("Subset produced empty font");
	}

	const result = new Uint8Array(
		new Uint8Array(hb.memory.buffer, offset, length)
	);

	hb.hb_blob_destroy(resultBlob);
	hb.hb_face_destroy(subsetFace);
	hb.hb_face_destroy(face);
	hb.free(fontPtr);

	return result;
};
