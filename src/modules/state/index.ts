import { createStore, produce } from "solid-js/store";

import { parseFontInWorker, prioritizeFont } from "~/modules/fonts/parser";

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

  const existingKeys = new Set(
    Object.values(store.fonts).map((f) => f.fileName)
  );
  const newFonts: TFont[] = [];
  for (const file of newFiles) {
    if (existingKeys.has(file.name)) continue;
    const font = createFontFromFile(file);
    newFonts.push(font);
    existingKeys.add(file.name);

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
};

const selectFont = (fontId: string) => {
  setStore("selectedFontId", fontId);
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
    const [first, ...rest] = parsedFonts;

    // Update the original font's name from parsed metadata and store its parsed data
    setStore("fonts", font.id, "name", first.info.fullName);
    setStore("parsedFonts", font.id, first);

    // For font collections (TTC/OTC), create new font entries for additional fonts
    if (rest.length > 0) {
      const extraFonts = rest.map((parsed) =>
        createFontForCollectionEntry(parsed, font)
      );

      setStore(
        produce((prev) => {
          const parentIndex = prev.fontOrder.indexOf(font.id);
          const insertAt = parentIndex >= 0 ? parentIndex + 1 : prev.fontOrder.length;
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
    }
  } catch (error) {
    // Log parsing errors for debugging
    // eslint-disable-next-line no-console
    console.error("Font parsing failed:", error);
  } finally {
    setStore("parsingFonts", font.id, false);
  }
};

const toggleGlyph = (fontId: string, codePoints: string) => {
  setStore("fonts", fontId, "disabledCodePoints", codePoints, (prev) => !prev);
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
};

const toggleGroupCollapsed = (fontId: string, groupId: string) => {
  setStore("fonts", fontId, "collapsedGroups", groupId, (prev) => !prev);
};

export {
  addFonts,
  selectFont,
  store,
  toggleGlyph,
  toggleGroup,
  toggleGroupCollapsed,
};
