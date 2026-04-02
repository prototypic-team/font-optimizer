declare module "Types" {
  export type TFont = {
    id: string;
    name: string;
    fileName: string;
    extension: string;
    file: File;
    disabledCodePoints: Record<string, boolean>;
    collapsedGroups: Record<string, boolean>;
    weight: {
      original: number;
      estimated?: number;
      estimating?: boolean;
    };
  };

  type TFontsState = {
    fonts: Record<string, TFont>;
    fontOrder: string[];
    selectedFontId: string | null;
    parsedFonts: Record<string, TParsedFont>;
    parsingFonts: Record<string, boolean>;
  };
}
