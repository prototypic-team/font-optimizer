import { zlibSync } from "fflate";
import hbSubsetUrl from "harfbuzzjs/hb-subset.wasm?url";
import { compress } from "woff2-encoder";

import type { HbExports } from "./subset";
import { subset, WOFF_SIGNATURE } from "./subset";

let hbExports: HbExports | null = null;

const getHb = async (): Promise<HbExports> => {
	if (hbExports) return hbExports;

	const wasmUrl = hbSubsetUrl as string;
	const response = await fetch(wasmUrl);
	const wasmBytes = await response.arrayBuffer();
	const { instance } = await WebAssembly.instantiate(wasmBytes);
	hbExports = instance.exports as unknown as HbExports;
	return hbExports;
};

type SfntTable = {
	tag: number;
	checksum: number;
	data: Uint8Array;
};

const parseSfntTables = (sfnt: Uint8Array): { flavor: number; tables: SfntTable[] } => {
	const view = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
	const flavor = view.getUint32(0);
	const numTables = view.getUint16(4);
	const tables: SfntTable[] = [];
	for (let i = 0; i < numTables; i++) {
		const rec = 12 + i * 16;
		const tag = view.getUint32(rec);
		const checksum = view.getUint32(rec + 4);
		const offset = view.getUint32(rec + 8);
		const length = view.getUint32(rec + 12);
		const data = new Uint8Array(
			sfnt.buffer,
			sfnt.byteOffset + offset,
			length
		);
		tables.push({ tag, checksum, data: new Uint8Array(data) });
	}
	tables.sort((a, b) => a.tag - b.tag);
	return { flavor, tables };
};

/** Build WOFF 1.0 from SFNT (WOFF table directory must be sorted by tag). */
const encodeWoff = (sfnt: Uint8Array): Uint8Array => {
	const { flavor, tables } = parseSfntTables(sfnt);
	const numTables = tables.length;

	let totalSfntSize = 12 + numTables * 16;
	for (const t of tables) {
		totalSfntSize += (t.data.byteLength + 3) & ~3;
	}

	const packed = tables.map((t) => {
		const origLength = t.data.byteLength;
		const deflated = zlibSync(t.data, { level: 9 });
		const useCompressed = deflated.byteLength < origLength;
		const data = useCompressed ? deflated : t.data;
		return {
			tag: t.tag,
			origChecksum: t.checksum,
			origLength,
			compLength: data.byteLength,
			data,
		};
	});

	const headerSize = 44;
	const dirSize = numTables * 20;
	let totalData = 0;
	for (const p of packed) {
		totalData += (p.compLength + 3) & ~3;
	}
	const totalLength = headerSize + dirSize + totalData;

	const out = new Uint8Array(totalLength);
	const view = new DataView(out.buffer);

	view.setUint32(0, WOFF_SIGNATURE);
	view.setUint32(4, flavor);
	view.setUint32(8, totalLength);
	view.setUint16(12, numTables);
	view.setUint16(14, 0);
	view.setUint32(16, totalSfntSize);
	view.setUint16(20, 1);
	view.setUint16(22, 0);
	view.setUint32(24, 0);
	view.setUint32(28, 0);
	view.setUint32(32, 0);
	view.setUint32(36, 0);

	let writeAt = headerSize + dirSize;
	for (let i = 0; i < numTables; i++) {
		const p = packed[i];
		const dir = headerSize + i * 20;
		view.setUint32(dir, p.tag);
		view.setUint32(dir + 4, writeAt);
		view.setUint32(dir + 8, p.compLength);
		view.setUint32(dir + 12, p.origLength);
		view.setUint32(dir + 16, p.origChecksum);
		out.set(p.data, writeAt);
		writeAt += (p.compLength + 3) & ~3;
	}

	return out;
};

self.onmessage = async (
	e: MessageEvent<{ id: string; fontBuffer: ArrayBuffer; codePoints: number[] }>
) => {
	const { id, fontBuffer, codePoints } = e.data;
	try {
		const hb = await getHb();
		const sfnt = await subset(hb, fontBuffer, codePoints);
		const woff = encodeWoff(sfnt);
		const woff2 = await compress(sfnt);
		(self as unknown as Worker).postMessage({ id, woff, woff2 });
	} catch (err) {
		(self as unknown as Worker).postMessage({
			id,
			error: err instanceof Error ? err.message : String(err),
		});
	}
};
