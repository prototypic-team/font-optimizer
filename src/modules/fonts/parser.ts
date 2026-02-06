import { create } from "fontkit";

import { getCategoryForCodePoint, GLYPH_CATEGORIES } from "./categories";
import { getFeatureName } from "./features";

import type { TFontInfo, TGlyphGroup, TParsedFont } from "Types";

const glyphNameRegEx = /^u.*\d+/;

/**
 * Parse font from an ArrayBuffer (e.g. in a worker).
 */
export const parseFontFromBuffer = (buffer: ArrayBuffer): TParsedFont => {
  const result = create(new Uint8Array(buffer) as unknown as Buffer);
  const font = "fonts" in result ? result.fonts[0] : result;

  const info: TFontInfo = {
    familyName: font.familyName ?? "Unknown",
    styleName: font.subfamilyName ?? "Regular",
    fullName: font.fullName ?? font.familyName ?? "Unknown",
    version: String(font.version ?? ""),
    bbox: {
      minX: font.bbox.minX,
      minY: font.bbox.minY,
      maxX: font.bbox.maxX,
      maxY: font.bbox.maxY,
      width: font.bbox.width,
      height: font.bbox.height,
    },
    isVariable: Object.keys(font.variationAxes ?? {}).length > 0,
  };

  const groups: Record<string, TGlyphGroup> = GLYPH_CATEGORIES.reduce(
    (acc, category) => {
      acc[category.id] = {
        category,
        glyphs: [],
      };
      return acc;
    },
    {} as Record<string, TGlyphGroup>
  );

  const glyphCodePoints: Record<number, number> = {};
  if (font.characterSet) {
    for (const codePoint of font.characterSet) {
      const glyph = font.glyphForCodePoint(codePoint);
      if (!glyph) continue;

      glyphCodePoints[glyph.id] = codePoint;

      const category = getCategoryForCodePoint(codePoint);
      groups[category.id].glyphs.push({
        id: glyph.id,
        codePoints: [codePoint],
        name: glyphNameRegEx.test(glyph.name) ? undefined : glyph.name,
        categoryId: category.id,
        path: glyph.path.toSVG(),
        advanceWidth: glyph.advanceWidth,
      });
    }
  }

  return {
    totalGlyphs: font.numGlyphs,
    groups: Object.values(groups),
    info,
    features: (font.availableFeatures ?? []).map((tag: string) => ({
      tag,
      name: getFeatureName(tag),
    })),
  };
};

export const formatCodePoint = (codePoint: number): string =>
  `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
