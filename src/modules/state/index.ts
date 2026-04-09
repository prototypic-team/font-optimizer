import { createStore, produce } from "solid-js/store";

import {
  exportFont,
  exportFonts,
  measureFontSize,
} from "~/modules/exporter/export";
import { parseFontInWorker, prioritizeFont } from "~/modules/parser/parse";
import {
  clearPersistedApp,
  loadPersistedBlob,
  loadPersistedMeta,
  PERSISTENCE_VERSION,
  savePersistedApp,
  savePersistedMeta,
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
  extension: extensionFromFile(file.name, file.type),
  file,
  disabledCodePoints: {},
  collapsedGroups: {},
  weight: {
    original: file.size,
    estimated: undefined,
  },
});

const [store, setStore] = createStore<TFontsState>({
  fonts: {},
  fontOrder: [],
  selectedFontId: null,
  parsedFonts: {},
  parsingFonts: {},
});

/** FontFace instances registered with `document.fonts` for preview; cleared on remove/clear. */
const fontFaces = new Map<string, FontFace>();

const unregisterFontFace = (fontId: string): void => {
  const face = fontFaces.get(fontId);
  if (!face) return;
  document.fonts.delete(face);
  fontFaces.delete(fontId);
};

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

const removeFont = (fontId: string) => {
  unregisterFontFace(fontId);
  setStore(
    produce((prev) => {
      delete prev.fonts[fontId];
      prev.fontOrder = prev.fontOrder.filter((id) => id !== fontId);
      delete prev.parsedFonts[fontId];
      delete prev.parsingFonts[fontId];
      if (prev.selectedFontId === fontId) {
        prev.selectedFontId = prev.fontOrder[0] ?? null;
      }
    })
  );
  schedulePersistSnapshot();
};

const clearFonts = () => {
  setStore(
    produce((prev) => {
      prev.fonts = {};
      prev.fontOrder = [];
      prev.selectedFontId = null;
      prev.parsedFonts = {};
      prev.parsingFonts = {};
    })
  );
  for (const id of [...fontFaces.keys()]) {
    unregisterFontFace(id);
  }
  schedulePersistSnapshot();
};

const selectFont = (fontId: string) => {
  setStore("selectedFontId", fontId);
  persistFontMeta();
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
  extension: source.extension,
  file: source.file,
  disabledCodePoints: {},
  collapsedGroups: {},
  weight: {
    original: source.weight.original,
    estimated: undefined,
    estimating: false,
  },
});

const registerFontFace = (font: TFont) => {
  font.file.arrayBuffer().then((buffer) => {
    if (!store.fonts[font.id]) return;

    const face = new FontFace(font.id, buffer);
    face.load().then((loaded) => {
      if (!store.fonts[font.id]) return;
      unregisterFontFace(font.id);
      document.fonts.add(loaded);
      fontFaces.set(font.id, loaded);
    });
  });
};

const loadParsedFont = async (font: TFont) => {
  if (store.parsedFonts[font.id] || store.parsingFonts[font.id]) return;

  setStore("parsingFonts", font.id, true);
  try {
    const parsedFonts = await parseFontInWorker(font.id, font.file);

    // Font was removed while the worker was parsing — discard results.
    if (!store.fonts[font.id]) return;

    const first = parsedFonts[0];
    let rest = parsedFonts.slice(1);

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
      unregisterFontFace(font.id);
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
    scheduleMeasurement(font.id);

    // For font collections (TTC/OTC), create new font entries for additional fonts,
    // skipping any faces whose full name is already present in the store.
    rest = rest.filter((parsed) => !existingNames.has(parsed.info.fullName));
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
            prev.parsedFonts[extraFonts[i].id] = rest[i];
          }
        })
      );

      for (let i = 0; i < extraFonts.length; i++) {
        registerFontFace(extraFonts[i]);
        scheduleMeasurement(extraFonts[i].id);
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
  setStore(
    produce((prev) => {
      const font = prev.fonts[fontId];
      if (!font) return prev;

      const parsed = prev.parsedFonts[fontId];
      if (!parsed) return prev;

      font.disabledCodePoints[codePoints] =
        !font.disabledCodePoints[codePoints];
      font.weight.estimating = true;
    })
  );
  persistFontMeta();
  scheduleMeasurement(fontId);
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

      font.weight.estimating = true;
    })
  );
  persistFontMeta();
  scheduleMeasurement(fontId);
};

const toggleGroupCollapsed = (fontId: string, groupId: string) => {
  // Match GlyphGroup: missing key means collapsed (same as `?? true` in UI).
  setStore("fonts", fontId, "collapsedGroups", groupId, (prev = true) => !prev);
  persistFontMeta();
};

const copySelectionToAllFonts = (sourceFontId: string) => {
  const sourceFont = store.fonts[sourceFontId];
  if (!sourceFont) return;

  setStore(
    produce((prev) => {
      for (const id of prev.fontOrder) {
        if (id === sourceFontId) continue;
        if (!prev.fonts[id]) continue;
        prev.fonts[id].disabledCodePoints = {
          ...sourceFont.disabledCodePoints,
        };
        prev.fonts[id].weight.estimating = true;
        scheduleMeasurement(id);
      }
    })
  );
  persistFontMeta();
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

const exportAllFonts = async (): Promise<void> => {
  const parsedFontIds = store.fontOrder.filter((id) => store.parsedFonts[id]);

  if (parsedFontIds.length === 0) {
    throw new Error("No fonts ready for export");
  }

  const fontData = await Promise.all(
    parsedFontIds.map(async (id) => {
      const font = store.fonts[id]!;
      const parsed = store.parsedFonts[id]!;
      const codePoints: number[] = [];
      for (const group of parsed.groups) {
        for (const glyph of group.glyphs) {
          const key = glyph.codePoints.join(",");
          if (!font.disabledCodePoints[key]) {
            codePoints.push(...glyph.codePoints);
          }
        }
      }
      return {
        buffer: await font.file.arrayBuffer(),
        codePoints,
        name: font.name,
      };
    })
  );

  await exportFonts(fontData);
};

const buildAppMeta = (): TPersistedAppMeta | null => {
  if (store.fontOrder.length === 0) return null;

  const fontsMeta: TPersistedAppMeta["fonts"] = {};
  for (const id of store.fontOrder) {
    const f = store.fonts[id];
    if (!f) continue;
    fontsMeta[id] = {
      id: f.id,
      name: f.name,
      fileName: f.fileName,
      extension: f.extension,
      disabledCodePoints: { ...f.disabledCodePoints },
      collapsedGroups: { ...f.collapsedGroups },
      weight: {
        original: f.weight.original,
        estimated: f.weight.estimated,
        estimating: f.weight.estimating,
      },
    };
  }

  const selectedFontId =
    store.selectedFontId && fontsMeta[store.selectedFontId]
      ? store.selectedFontId
      : (store.fontOrder[0] ?? null);

  return {
    version: PERSISTENCE_VERSION,
    fontOrder: [...store.fontOrder],
    selectedFontId,
    fonts: fontsMeta,
  };
};

const persistFontMeta = async (): Promise<void> => {
  const meta = buildAppMeta();
  if (!meta) return;
  await savePersistedMeta(meta);
};

const writePersistedSnapshot = async (): Promise<void> => {
  if (store.fontOrder.length === 0) {
    await clearPersistedApp();
    return;
  }

  const meta = buildAppMeta();
  if (!meta) return;

  const files: Record<string, File> = {};
  for (const id of store.fontOrder) {
    const f = store.fonts[id];
    if (f) files[id] = f.file;
  }

  await savePersistedApp({ meta, files });
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

// --- Background exact-size measurement ---
// After each selection change we debounce a real HarfBuzz subset to replace
// the formula estimate with the true WOFF2 byte count.

const measureTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const measureGeneration: Record<string, number> = {};

const measureFontBackground = async (fontId: string): Promise<void> => {
  const gen = (measureGeneration[fontId] ?? 0) + 1;
  measureGeneration[fontId] = gen;

  setStore("fonts", fontId, "weight", "estimating", true);
  try {
    const font = store.fonts[fontId];
    const parsed = store.parsedFonts[fontId];
    if (!font || !parsed) return;

    const codePoints: number[] = [];
    for (const group of parsed.groups) {
      for (const glyph of group.glyphs) {
        if (!font.disabledCodePoints[glyph.codePoints.join(",")]) {
          codePoints.push(...glyph.codePoints);
        }
      }
    }

    const buffer = await font.file.arrayBuffer();
    if (measureGeneration[fontId] !== gen) return;

    const measuredSize = await measureFontSize(buffer, codePoints);
    if (measureGeneration[fontId] !== gen || !store.fonts[fontId]) return;

    setStore(
      "fonts",
      fontId,
      produce((f) => {
        f.weight.estimated = measuredSize;
        f.weight.estimating = false;
      })
    );
    schedulePersistSnapshot();
  } catch (err) {
    console.error("Font measurement failed:", err);
    if (measureGeneration[fontId] === gen) {
      setStore("fonts", fontId, "weight", "estimating", false);
    }
  }
};

const scheduleMeasurement = (fontId: string, delay = 800): void => {
  if (measureTimers[fontId] !== undefined) clearTimeout(measureTimers[fontId]);
  measureTimers[fontId] = setTimeout(() => {
    delete measureTimers[fontId];
    measureFontBackground(fontId);
  }, delay);
};

const makeTFont = (f: TPersistedFontMeta, buf: ArrayBuffer): TFont => ({
  id: f.id,
  name: f.name,
  fileName: f.fileName,
  extension: f.extension,
  file: new File([buf], f.fileName, { type: mimeFromExtension(f.extension) }),
  disabledCodePoints: { ...f.disabledCodePoints },
  collapsedGroups: { ...f.collapsedGroups },
  weight: {
    original: f.weight.original,
    estimated: f.weight.estimated,
    estimating: f.weight.estimating,
  },
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
    const key = `${f.fileName}\0${f.weight.original}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(id);
  }

  // Identify which group contains the selected font so we load it first.
  const selectedMeta = selectedId ? meta.fonts[selectedId] : null;
  const primaryKey = selectedMeta
    ? `${selectedMeta.fileName}\0${selectedMeta.weight.original}`
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

  if (primaryLoaded.length > 0) hydrateParsedFontsForGroup(primaryLoaded);

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
    if (groupLoaded.length > 0) hydrateParsedFontsForGroup(groupLoaded);
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
      const f = store.fonts[ids[i]];
      if (!f.weight.estimated || f.weight.estimating) {
        scheduleMeasurement(ids[i], 0);
      }
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
  clearFonts,
  copySelectionToAllFonts,
  exportAllFonts,
  exportSelectedFont,
  persistFontMeta,
  removeFont,
  selectFont,
  store,
  toggleGlyph,
  toggleGroup,
  toggleGroupCollapsed,
};
