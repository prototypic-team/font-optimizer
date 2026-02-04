import { create, Font } from "fontkit";

import {
  getCategoryForCodePoint,
  GLYPH_CATEGORIES,
  LIGATURE_CATEGORY,
} from "./categories";
import { getFeatureName } from "./features";

import type { TFontInfo, TGlyph, TGlyphGroup, TParsedFont } from "Types";

const glyphNameRegEx = /^u.*\d+/;

type TLigature = {
  glyph: number;
  components: number[];
};

type TLookupList = {
  lookupType: number;
  subTables: {
    coverage: {
      glyphs: number[];
    };
    ligatureSets: {
      toArray: () => TLigature[][];
    };
  }[];
};

type FontWithGSUB = Font & {
  GSUB?: {
    lookupList?: {
      toArray: () => TLookupList[];
    };
  };
};

function extractLigaturesFromGSUB(
  font: FontWithGSUB,
  glyphCodePoints: Record<number, number>
): TGlyph[] {
  if (!font.GSUB?.lookupList) return [];

  const lookupList = font.GSUB.lookupList?.toArray() ?? [];
  const glyphs: TGlyph[] = [];

  for (const lookup of [...lookupList]) {
    if (lookup.lookupType !== 4) continue;

    const ligatures = lookup.subTables.flatMap((subtable) => {
      // Each set in ligatures sets correspond to a specific glyph in the coverage
      // array. So we map sets to the glyph by their index.
      const sets = subtable.ligatureSets.toArray();

      return subtable.coverage.glyphs.flatMap((gid, index) => {
        const set = sets[index];
        if (!set) return [];
        return set.map((ligature) => ({
          ...ligature,
          components: [gid, ...ligature.components],
        }));
      });
    });

    for (const ligature of ligatures) {
      const glyph = font.getGlyph(ligature.glyph);
      if (!glyph) continue;

      const codePoints = ligature.components.map(
        (gid: number) => glyphCodePoints[gid]
      );

      glyphs.push({
        id: glyph.id,
        name: String.fromCodePoint(...codePoints),
        categoryId: LIGATURE_CATEGORY.id,
        path: glyph.path.toSVG(),
        advanceWidth: glyph.advanceWidth,
      });
    }
  }

  return glyphs;
}

/**
 * Parse a font file and extract all glyphs with their metadata
 */
export const parseFont = async (file: File): Promise<TParsedFont> => {
  const buffer = await file.arrayBuffer();
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

  let ligatureGroup: TGlyphGroup = { category: LIGATURE_CATEGORY, glyphs: [] };
  try {
    const ligatures = extractLigaturesFromGSUB(
      font as FontWithGSUB,
      glyphCodePoints
    );
    ligatureGroup = { category: LIGATURE_CATEGORY, glyphs: ligatures };
  } catch {
    // Font has no GSUB or ligature table structure differs
  }

  return {
    totalGlyphs: font.numGlyphs,
    groups: [...Object.values(groups), ligatureGroup],
    info,
    features: (font.availableFeatures ?? []).map((tag: string) => ({
      tag,
      name: getFeatureName(tag),
    })),
  };
};

export const formatCodePoint = (codePoint: number): string =>
  `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
