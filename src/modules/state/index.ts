import { createStore, produce } from "solid-js/store";

import { exportFont } from "~/modules/exporter/export";
import { parseFontInWorker, prioritizeFont } from "~/modules/parser/parse";
import {
  clearPersistedApp,
  loadPersistedBlob,
  loadPersistedMeta,
  PERSISTENCE_VERSION,
  savePersistedApp,
  type TPersistedAppMeta,
  type TPersistedFontMeta,
} from "~/modules/persistence/persistence";

import type { TFont, TFontsState, TParsedFont } from "Types";

const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf", ".ttc", ".otc"];

const normalizeName = (fileName: string): string => {
  let name = fileName;
  const lower = name.toLowerCase();
  for (const ext of FONT_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      name = name.slice(0, -ext.length);
      break;
    }
  }
  return name.replace(/[-_]+/g, " ").trim();
};

const EXT_TO_MIME: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  ttc: "font/collection",
  otc: "font/collection",
};

const mimeFromExtension = (ext: string): string =>
  EXT_TO_MIME[ext] ?? "application/octet-stream";

const MIME_TO_EXT: Record<string, string> = {
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "font/collection": "ttc",
  "application/font-woff2": "woff2",
  "application/font-woff": "woff",
  "application/x-font-ttf": "ttf",
  "application/x-font-otf": "otf",
};

const extensionFromFile = (fileName: string, mimeType: string): string => {
  const lower = fileName.toLowerCase();
  for (const ext of FONT_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext.slice(1);
  }
  return MIME_TO_EXT[mimeType] ?? "";
};

const createFontFromFile = (file: File): TFont => ({
  id: crypto.randomUUID(),
  name: normalizeName(file.name),
  fileName: file.name,
  size: file.size,
  extension: extensionFromFile(file.name, file.type),
  file,
  disabledCodePoints: {},
  collapsedGroups: {},
});

const [store, setStore] = createStore<TFontsState>({
  fonts: {},
  fontOrder: [],
  selectedFontId: null,
  parsedFonts: {},
  parsingFonts: {},
});

const addFonts = (files: File[]) => {
  const newFiles = [...files];

  // Deduplicate by normalized name (filename without extension) to prevent
  // adding the same font in multiple formats (e.g. .woff2 + .ttf of same face).
  const existingNormalizedNames = new Set(
    Object.values(store.fonts).map((f) => normalizeName(f.fileName))
  );
  const newFonts: TFont[] = [];
  for (const file of newFiles) {
    const normalizedName = normalizeName(file.name);
    if (existingNormalizedNames.has(normalizedName)) continue;
    const font = createFontFromFile(file);
    newFonts.push(font);
    existingNormalizedNames.add(normalizedName);

    registerFontFace(font);
  }

  setStore(
    produce((prev) => {
      for (const font of newFonts) {
        prev.fonts[font.id] = font;
        prev.fontOrder.push(font.id);
      }
      if (!prev.selectedFontId) {
        prev.selectedFontId = newFonts[0].id;
      }
    })
  );

  // Enqueue selected font first, then all others
  const selected = store.selectedFontId;
  for (const font of newFonts) {
    if (font.id === selected) {
      loadParsedFont(font);
    }
  }
  for (const font of newFonts) {
    if (font.id !== selected) {
      loadParsedFont(font);
    }
  }

  schedulePersistSnapshot();
};

const selectFont = (fontId: string) => {
  setStore("selectedFontId", fontId);
  schedulePersistSnapshot();
  const font = store.fonts[fontId];
  if (font && !store.parsedFonts[fontId]) {
    if (store.parsingFonts[fontId]) {
      prioritizeFont(fontId);
    } else {
      loadParsedFont(font);
    }
  }
};

const createFontForCollectionEntry = (
  parsed: TParsedFont,
  source: TFont
): TFont => ({
  id: crypto.randomUUID(),
  name: parsed.info.fullName,
  fileName: source.fileName,
  size: source.size,
  extension: source.extension,
  file: source.file,
  disabledCodePoints: {},
  collapsedGroups: {},
});

const registerFontFace = (font: TFont) => {
  font.file.arrayBuffer().then((buffer) => {
    const face = new FontFace(font.id, buffer);
    face.load().then((loaded) => {
      document.fonts.add(loaded);
    });
  });
};

const loadParsedFont = async (font: TFont) => {
  if (store.parsedFonts[font.id] || store.parsingFonts[font.id]) return;

  setStore("parsingFonts", font.id, true);
  try {
    const parsedFonts = await parseFontInWorker(font.id, font.file);
    let [first, ...rest] = parsedFonts;

    // Build a set of full names already in the store (excluding this font's
    // own placeholder so it doesn't match itself).
    const existingNames = new Set(
      Object.entries(store.fonts)
        .filter(([id]) => id !== font.id)
        .map(([, f]) => f.name)
    );

    // If the primary face duplicates an existing font, discard the placeholder
    // and bail out — nothing useful to add.
    if (existingNames.has(first.info.fullName)) {
      setStore(
        produce((prev) => {
          delete prev.fonts[font.id];
          delete prev.parsingFonts[font.id];
          prev.fontOrder = prev.fontOrder.filter((id) => id !== font.id);
          if (prev.selectedFontId === font.id) {
            prev.selectedFontId = prev.fontOrder[0] ?? null;
          }
        })
      );
      return;
    }

    // Update the original font's name from parsed metadata and store its parsed data
    setStore("fonts", font.id, "name", first.info.fullName);
    setStore("parsedFonts", font.id, first);
    existingNames.add(first.info.fullName);

    // For font collections (TTC/OTC), create new font entries for additional fonts,
    // skipping any faces whose full name is already present in the store.
    rest = rest.filter(
      (parsed) => !existingNames.has(parsed.info.fullName)
    );
    if (rest.length > 0) {
      const extraFonts = rest.map((parsed) =>
          createFontForCollectionEntry(parsed, font)
        );

        setStore(
          produce((prev) => {
            const parentIndex = prev.fontOrder.indexOf(font.id);
            const insertAt =
              parentIndex >= 0 ? parentIndex + 1 : prev.fontOrder.length;
            for (let i = 0; i < extraFonts.length; i++) {
              prev.fonts[extraFonts[i].id] = extraFonts[i];
              prev.fontOrder.splice(insertAt + i, 0, extraFonts[i].id);
            }
          })
        );

      for (let i = 0; i < extraFonts.length; i++) {
        setStore("parsedFonts", extraFonts[i].id, rest[i]);
        registerFontFace(extraFonts[i]);
      }
      schedulePersistSnapshot();
    }
  } catch (error) {
    console.error("Font parsing failed:", error);
  } finally {
    setStore("parsingFonts", font.id, false);
  }

  schedulePersistSnapshot();
};

const toggleGlyph = (fontId: string, codePoints: string) => {
  setStore("fonts", fontId, "disabledCodePoints", codePoints, (prev) => !prev);
  schedulePersistSnapshot();
};

const toggleGroup = (fontId: string, groupId: string) => {
  setStore(
    produce((prev) => {
      const font = prev.fonts[fontId];
      if (!font) return prev;

      const parsed = prev.parsedFonts[fontId];
      if (!parsed) return prev;

      const group = parsed.groups.find((g) => g.category.id === groupId);
      if (!group) return prev;

      const allDisabled = group.glyphs.every(
        (glyph) => font.disabledCodePoints[glyph.codePoints.join(",")]
      );

      group.glyphs.forEach((glyph) => {
        font.disabledCodePoints[glyph.codePoints.join(",")] = !allDisabled;
      });
    })
  );
  schedulePersistSnapshot();
};

const toggleGroupCollapsed = (fontId: string, groupId: string) => {
  // Match GlyphGroup: missing key means collapsed (same as `?? true` in UI).
  setStore("fonts", fontId, "collapsedGroups", groupId, (prev = true) => !prev);
  schedulePersistSnapshot();
};

const exportSelectedFont = async (): Promise<void> => {
  const fontId = store.selectedFontId;
  const font = fontId ? store.fonts[fontId] : undefined;
  const parsed = fontId ? store.parsedFonts[fontId] : undefined;

  if (!font || !parsed) {
    throw new Error("No font selected or font not yet parsed");
  }

  const codePoints: number[] = [];
  for (const group of parsed.groups) {
    for (const glyph of group.glyphs) {
      const key = glyph.codePoints.join(",");
      if (!font.disabledCodePoints[key]) {
        codePoints.push(...glyph.codePoints);
      }
    }
  }

  const buffer = await font.file.arrayBuffer();
  await exportFont(buffer, codePoints, font.name);
};

const writePersistedSnapshot = async (): Promise<void> => {
  if (store.fontOrder.length === 0) {
    await clearPersistedApp();
    return;
  }

  const fontsMeta: TPersistedAppMeta["fonts"] = {};
  const files: Record<string, File> = {};

  for (const id of store.fontOrder) {
    const f = store.fonts[id];
    if (!f) continue;
    fontsMeta[id] = {
      id: f.id,
      name: f.name,
      fileName: f.fileName,
      size: f.size,
      extension: f.extension,
      disabledCodePoints: { ...f.disabledCodePoints },
      collapsedGroups: { ...f.collapsedGroups },
    };
    files[id] = f.file;
  }

  const selectedFontId =
    store.selectedFontId && fontsMeta[store.selectedFontId]
      ? store.selectedFontId
      : (store.fontOrder[0] ?? null);

  await savePersistedApp({
    meta: {
      version: PERSISTENCE_VERSION,
      fontOrder: [...store.fontOrder],
      selectedFontId,
      fonts: fontsMeta,
    },
    files,
  });
};

let persistTimer: ReturnType<typeof setTimeout> | undefined;
const schedulePersistSnapshot = (): void => {
  if (persistTimer !== undefined) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = undefined;
    writePersistedSnapshot().catch((e) => {
      console.error("Failed to persist app state:", e);
    });
  }, 400);
};

const makeTFont = (f: TPersistedFontMeta, buf: ArrayBuffer): TFont => ({
  id: f.id,
  name: f.name,
  fileName: f.fileName,
  size: f.size,
  extension: f.extension,
  file: new File([buf], f.fileName, { type: mimeFromExtension(f.extension) }),
  disabledCodePoints: { ...f.disabledCodePoints },
  collapsedGroups: { ...f.collapsedGroups },
});

/**
 * Two-phase hydration: loads meta + the selected font's physical-file group
 * first (calling onReady so the UI can show), then loads remaining groups
 * in the background.
 */
export const hydrateFromPersistence = async (
  onReady: () => void
): Promise<void> => {
  const meta = await loadPersistedMeta();
  if (!meta) {
    onReady();
    return;
  }

  const selectedId =
    meta.selectedFontId && meta.fonts[meta.selectedFontId]
      ? meta.selectedFontId
      : (meta.fontOrder[0] ?? null);

  // Group all font IDs by physical file (important for TTC correctness).
  const groups = new Map<string, string[]>();
  for (const id of meta.fontOrder) {
    const f = meta.fonts[id];
    if (!f) continue;
    const key = `${f.fileName}\0${f.size}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(id);
  }

  // Identify which group contains the selected font so we load it first.
  const selectedMeta = selectedId ? meta.fonts[selectedId] : null;
  const primaryKey = selectedMeta
    ? `${selectedMeta.fileName}\0${selectedMeta.size}`
    : null;
  const primaryIds = primaryKey ? (groups.get(primaryKey) ?? []) : [];

  // Phase 1: load the primary group's blobs and populate the store.
  const fonts: Record<string, TFont> = {};
  const primaryLoaded: string[] = [];
  let resolvedSelectedId: string | null = null;
  for (const id of primaryIds) {
    const f = meta.fonts[id];
    if (!f) continue;
    const buf = await loadPersistedBlob(id);
    if (!buf) continue;
    fonts[id] = makeTFont(f, buf);
    primaryLoaded.push(id);
    if (!resolvedSelectedId || id === selectedId) resolvedSelectedId = id;
  }

  setStore({
    fonts: { ...fonts },
    fontOrder: primaryLoaded,
    selectedFontId: resolvedSelectedId,
    parsedFonts: {},
    parsingFonts: {},
  });

  if (primaryLoaded.length > 0) void hydrateParsedFontsForGroup(primaryLoaded);

  // UI can render now — selected font is in the store and being parsed.
  onReady();

  // Phase 2: load remaining blobs in the background.
  // fontOrder is intentionally left alone until all groups finish so that no
  // partial snapshot fires mid-load (only user actions trigger schedulePersistSnapshot).
  for (const [key, ids] of groups) {
    if (key === primaryKey) continue;
    const groupLoaded: string[] = [];
    for (const id of ids) {
      const f = meta.fonts[id];
      if (!f) continue;
      const buf = await loadPersistedBlob(id);
      if (!buf) continue;
      const font = makeTFont(f, buf);
      fonts[id] = font;
      setStore("fonts", id, font);
      groupLoaded.push(id);
    }
    if (groupLoaded.length > 0) void hydrateParsedFontsForGroup(groupLoaded);
  }

  // Restore the original font order (phase-1 put the selected group first),
  // then persist the fully-hydrated state once.
  const finalOrder = meta.fontOrder.filter((id) => !!store.fonts[id]);
  setStore("fontOrder", finalOrder);
  schedulePersistSnapshot();
};

/** Parse each physical file once and map faces to persisted font ids (avoids TTC re-expansion). */
const hydrateParsedFontsForGroup = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const firstFont = store.fonts[ids[0]];
  if (!firstFont) return;

  for (const id of ids) {
    const f = store.fonts[id];
    if (f) registerFontFace(f);
  }

  setStore("parsingFonts", firstFont.id, true);
  try {
    const parsedList = await parseFontInWorker(firstFont.id, firstFont.file);
    const n = Math.min(parsedList.length, ids.length);
    for (let i = 0; i < n; i++) {
      setStore("fonts", ids[i], "name", parsedList[i].info.fullName);
      setStore("parsedFonts", ids[i], parsedList[i]);
    }
    if (parsedList.length !== ids.length) {
      console.warn(
        "Persisted font face count does not match file parse result; some glyphs may be missing"
      );
    }
  } catch (error) {
    console.error("Font parsing failed on hydrate:", error);
  } finally {
    setStore("parsingFonts", firstFont.id, false);
  }
};

export {
  addFonts,
  exportSelectedFont,
  selectFont,
  store,
  toggleGlyph,
  toggleGroup,
  toggleGroupCollapsed,
};
