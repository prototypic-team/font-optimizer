import { zlibSync } from "fflate";
import hbSubsetUrl from "harfbuzzjs/hb-subset.wasm?url";
import { compress } from "woff2-encoder";

type HbExports = {
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

const WOFF_SIGNATURE = 0x774f4646; // 'wOFF'
const WOFF2_SIGNATURE = 0x774f4632; // 'wOF2'

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

const subset = async (
  fontBuffer: ArrayBuffer,
  codePoints: number[]
): Promise<Uint8Array> => {
  const sfntBuffer = await toSfnt(fontBuffer);
  const hb = await getHb();

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
  e: MessageEvent<{ fontBuffer: ArrayBuffer; codePoints: number[] }>
) => {
  try {
    const sfnt = await subset(e.data.fontBuffer, e.data.codePoints);
    const woff = encodeWoff(sfnt);
    const woff2 = await compress(sfnt);
    (self as unknown as Worker).postMessage({
      woff,
      woff2,
    });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
