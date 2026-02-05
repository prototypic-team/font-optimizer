import { createStore, produce } from "solid-js/store";

import { parseFont } from "~/modules/fonts/parser";
import { fontsPredicate } from "~/modules/fonts/utils";

import type { TFont, TParsedFont } from "Types";

const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];

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
});

type TFontsState = {
  fonts: Record<string, TFont>;
  selectedFontId: string | null;
  parsedFonts: Record<string, TParsedFont>;
  parsingFontId: string | null;
};

const [store, setStore] = createStore<TFontsState>({
  fonts: {},
  selectedFontId: null,
  parsedFonts: {},
  parsingFontId: null,
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

    const url = URL.createObjectURL(font.file);
    const face = new FontFace(font.id, `url(${url})`);
    face.load().then((loaded) => {
      document.fonts.add(loaded);
    });
  }

  setStore(
    produce((prev) => {
      for (const font of newFonts) {
        prev.fonts[font.id] = font;
      }
      if (!prev.selectedFontId) {
        const sortedFonts = Object.values(prev.fonts).sort(fontsPredicate);
        prev.selectedFontId = sortedFonts[0].id;
        loadParsedFont(sortedFonts[0]);
      }
    })
  );
};

const selectFont = (fontId: string) => {
  setStore("selectedFontId", fontId);
  const font = store.fonts[fontId];
  if (font && !store.parsedFonts[fontId]) {
    loadParsedFont(font);
  }
};

const loadParsedFont = async (font: TFont) => {
  if (store.parsedFonts[font.id]) return;

  setStore("parsingFontId", font.id);
  try {
    const parsed = await parseFont(font.file);
    setStore("parsedFonts", font.id, parsed);
  } catch (error) {
    // Log parsing errors for debugging
    // eslint-disable-next-line no-console
    console.error("Font parsing failed:", error);
  } finally {
    setStore("parsingFontId", null);
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

export { addFonts, selectFont, store, toggleGlyph, toggleGroup };
