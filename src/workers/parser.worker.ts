import { create, Font } from "fontkit";

import {
  getCategoryForCodePoint,
  GLYPH_CATEGORIES,
} from "~/modules/fonts/categories";
import { getFeatureName } from "~/modules/fonts/features";

import type { TFontInfo, TGlyphGroup, TParsedFont } from "Types";

type TParseRequest = {
  fontId: string;
  file: File;
};

type TParseSuccess = {
  fontId: string;
  parsed: TParsedFont[];
};

type TParseError = {
  fontId: string;
  error: string;
};

const glyphNameRegEx = /^u.*\d+/;

const parseSingleFont = (font: Font): TParsedFont => {
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

  if (font.characterSet) {
    for (const codePoint of font.characterSet) {
      const glyph = font.glyphForCodePoint(codePoint);
      if (!glyph) continue;

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

self.onmessage = async (e: MessageEvent<TParseRequest>) => {
  const { fontId, file } = e.data;
  try {
    const buffer = await file.arrayBuffer();
    const result = create(new Uint8Array(buffer) as unknown as Buffer);
    const fonts = "fonts" in result ? result.fonts : [result];
    const parsed = fonts.map(parseSingleFont);

    (self as unknown as Worker).postMessage({
      fontId,
      parsed,
    } satisfies TParseSuccess);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    (self as unknown as Worker).postMessage({
      fontId,
      error,
    } satisfies TParseError);
  }
};
