declare module "Types" {
  export type TGlyph = {
    id: number;
    codePoints: number[];
    name?: string;
    categoryId: string;
    path: string;
    advanceWidth: number;
  };

  export type TGlyphCategory = {
    id: string;
    name: string;
    description: string;
    ranges: Array<[number, number]>;
  };

  export type TGlyphGroup = {
    category: TGlyphCategory;
    glyphs: TGlyph[];
  };

  export type TFontFeature = {
    tag: string;
    name: string;
  };

  export type TBBox = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };

  export type TFontInfo = {
    familyName: string;
    styleName: string;
    fullName: string;
    version: string;
    bbox: TBBox;
    isVariable: boolean;
  };

  export type TParsedFont = {
    totalGlyphs: number;
    groups: TGlyphGroup[];
    info: TFontInfo;
    features: TFontFeature[];
  };
}
