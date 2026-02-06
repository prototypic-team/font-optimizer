import { createMemo } from "solid-js";

import { store } from "../state";

import { TFont } from "Types";

export const fontsPredicate = (a: TFont, b: TFont) => {
  return a.name.localeCompare(b.name) || a.extension.localeCompare(b.extension);
};

export const useCurrentFont = () => ({
  base: createMemo(() =>
    store.selectedFontId ? store.fonts[store.selectedFontId] : undefined
  ),
  parsed: createMemo(() =>
    store.selectedFontId ? store.parsedFonts[store.selectedFontId] : undefined
  ),
  isParsing: createMemo(
    () => !!store.selectedFontId && !!store.parsingFonts[store.selectedFontId]
  ),
});

export const estimateSize = (
  glyphCount: number,
  totalGlyphs: number,
  fontFileSize: number
): { bytes: number; kb: number } => {
  if (totalGlyphs === 0 || fontFileSize === 0) return { bytes: 0, kb: 0 };
  // Estimate: glyphs are roughly 60-70% of font file size (rest is metadata, tables)
  const glyphDataRatio = 0.65;
  const estimatedBytes = Math.round(
    (glyphCount / totalGlyphs) * fontFileSize * glyphDataRatio
  );
  return { bytes: estimatedBytes, kb: Math.round(estimatedBytes / 1024) };
};
