import {
	idbClearAppData,
	idbDeleteBlob,
	idbGetAllBlobKeys,
	idbGetBlob,
	idbGetMeta,
	idbHasBlob,
	idbPutBlob,
	idbPutMeta,
} from "~/modules/persistence/idb";

export const PERSISTENCE_VERSION = 1 as const;

export type TPersistedFontMeta = {
	id: string;
	name: string;
	fileName: string;
	size: number;
	extension: string;
	disabledCodePoints: Record<string, boolean>;
	collapsedGroups: Record<string, boolean>;
};

export type TPersistedAppMeta = {
	version: typeof PERSISTENCE_VERSION;
	fontOrder: string[];
	selectedFontId: string | null;
	fonts: Record<string, TPersistedFontMeta>;
};

const fileArrayBufferCache = new WeakMap<File, Promise<ArrayBuffer>>();
const getFileBuf = (file: File): Promise<ArrayBuffer> => {
	const cached = fileArrayBufferCache.get(file);
	if (cached) return cached;
	const p = file.arrayBuffer();
	fileArrayBufferCache.set(file, p);
	return p;
};

const isPersistedAppMeta = (value: unknown): value is TPersistedAppMeta => {
	if (!value || typeof value !== "object") return false;
	const o = value as TPersistedAppMeta;
	return (
		o.version === PERSISTENCE_VERSION &&
		Array.isArray(o.fontOrder) &&
		typeof o.fonts === "object" &&
		o.fonts !== null
	);
};

export const loadPersistedMeta = async (): Promise<TPersistedAppMeta | null> => {
	try {
		const raw = await idbGetMeta();
		if (!raw || !isPersistedAppMeta(raw)) return null;
		return raw;
	} catch (e) {
		console.warn("Failed to load persisted meta:", e);
		return null;
	}
};

export const loadPersistedBlob = async (id: string): Promise<ArrayBuffer | null> => {
	try {
		const buf = await idbGetBlob(id);
		if (!buf) {
			console.warn("Persisted font blob missing for id:", id);
			return null;
		}
		return buf;
	} catch (e) {
		console.warn("Failed to load persisted blob:", id, e);
		return null;
	}
};

export const savePersistedApp = async (params: {
	meta: TPersistedAppMeta;
	files: Record<string, File>;
}): Promise<void> => {
	const { meta, files } = params;

	// Blobs first so a crash never leaves meta pointing at missing blobs.
	for (const id of meta.fontOrder) {
		const file = files[id];
		if (!file) continue;
		if (await idbHasBlob(id)) continue;
		await idbPutBlob(id, await getFileBuf(file));
	}
	await idbPutMeta(meta);

	// Delete orphaned blobs after meta is committed so we never delete a blob
	// that the current meta still references.
	const activeIds = new Set(meta.fontOrder);
	const allKeys = await idbGetAllBlobKeys();
	for (const key of allKeys) {
		if (!activeIds.has(key)) await idbDeleteBlob(key);
	}
};

export const clearPersistedApp = (): Promise<void> => idbClearAppData();
