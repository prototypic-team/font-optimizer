/**
 * Glyph categories optimized for font subsetting.
 * Categories are ordered by typical usage frequency in web content.
 */

import { TGlyphCategory } from "Types";

/**
 * Check if a code point falls within any of the category's ranges
 */
export const isInCategory = (
  codePoint: number,
  category: TGlyphCategory
): boolean =>
  category.ranges.some(
    ([start, end]) => codePoint >= start && codePoint <= end
  );

/**
 * Find the category for a given code point
 */
export const getCategoryForCodePoint = (codePoint: number): TGlyphCategory =>
  GLYPH_CATEGORIES.find((cat) => isInCategory(codePoint, cat)) ??
  OTHER_CATEGORY;

const OTHER_CATEGORY: TGlyphCategory = {
  id: "other",
  name: "Other",
  description: "Uncategorized glyphs",
  ranges: [],
};

export const LIGATURE_CATEGORY: TGlyphCategory = {
  id: "ligatures",
  name: "Ligatures",
  description: "Glyph substitutions for character sequences (e.g. fi, fl)",
  ranges: [],
};

export const GLYPH_CATEGORIES: TGlyphCategory[] = [
  {
    id: "basic-latin",
    name: "Basic Latin",
    description: "Essential letters, numbers, and ASCII punctuation",
    ranges: [
      [0x0020, 0x007e], // Space through tilde (printable ASCII)
    ],
  },
  {
    id: "latin-supplement",
    name: "Latin Supplement",
    description: "Extended Latin characters with diacritics (Western European)",
    ranges: [
      [0x00a0, 0x00ff], // Latin-1 Supplement
    ],
  },
  {
    id: "latin-extended",
    name: "Latin Extended",
    description:
      "Additional Latin characters for Central/Eastern European languages",
    ranges: [
      [0x0100, 0x017f], // Latin Extended-A
      [0x0180, 0x024f], // Latin Extended-B
      [0x1e00, 0x1eff], // Latin Extended Additional
    ],
  },
  {
    id: "punctuation",
    name: "General Punctuation",
    description: "Typographic punctuation, dashes, quotes, and spaces",
    ranges: [
      [0x2000, 0x206f], // General Punctuation
    ],
  },
  {
    id: "currency",
    name: "Currency Symbols",
    description: "Currency signs and symbols",
    ranges: [
      [0x20a0, 0x20cf], // Currency Symbols
    ],
  },
  {
    id: "symbols",
    name: "Common Symbols",
    description: "Letterlike symbols, number forms, and miscellaneous symbols",
    ranges: [
      [0x2100, 0x214f], // Letterlike Symbols (™, ℃, №, etc.)
      [0x2150, 0x218f], // Number Forms (fractions, Roman numerals)
      [0x2190, 0x21ff], // Arrows
      [0x2600, 0x26ff], // Miscellaneous Symbols
      [0x2700, 0x27bf], // Dingbats
    ],
  },
  {
    id: "math",
    name: "Mathematical",
    description: "Mathematical operators and symbols",
    ranges: [
      [0x2200, 0x22ff], // Mathematical Operators
      [0x2300, 0x23ff], // Miscellaneous Technical
      [0x27c0, 0x27ef], // Miscellaneous Mathematical Symbols-A
      [0x2980, 0x29ff], // Miscellaneous Mathematical Symbols-B
      [0x2a00, 0x2aff], // Supplemental Mathematical Operators
    ],
  },
  {
    id: "greek",
    name: "Greek",
    description: "Greek alphabet and Coptic",
    ranges: [
      [0x0370, 0x03ff], // Greek and Coptic
      [0x1f00, 0x1fff], // Greek Extended
    ],
  },
  {
    id: "cyrillic",
    name: "Cyrillic",
    description: "Cyrillic alphabet",
    ranges: [
      [0x0400, 0x04ff], // Cyrillic
      [0x0500, 0x052f], // Cyrillic Supplement
      [0x2de0, 0x2dff], // Cyrillic Extended-A
      [0xa640, 0xa69f], // Cyrillic Extended-B
    ],
  },
  {
    id: "box-drawing",
    name: "Box Drawing",
    description: "Box drawing characters and block elements",
    ranges: [
      [0x2500, 0x257f], // Box Drawing
      [0x2580, 0x259f], // Block Elements
      [0x25a0, 0x25ff], // Geometric Shapes
    ],
  },
  {
    id: "emoji",
    name: "Emoji & Pictographs",
    description: "Emoji and pictographic symbols",
    ranges: [
      [0x1f300, 0x1f5ff], // Miscellaneous Symbols and Pictographs
      [0x1f600, 0x1f64f], // Emoticons
      [0x1f680, 0x1f6ff], // Transport and Map Symbols
      [0x1f900, 0x1f9ff], // Supplemental Symbols and Pictographs
    ],
  },
  OTHER_CATEGORY,
  LIGATURE_CATEGORY,
];

/**
 * Get category by id
 */
export const getCategoryById = (id: string): TGlyphCategory | undefined =>
  GLYPH_CATEGORIES.find((cat) => cat.id === id);
