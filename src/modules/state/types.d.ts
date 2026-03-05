declare module "Types" {
  export type TFont = {
    id: string;
    name: string;
    fileName: string;
    size: number;
    extension: string;
    file: File;
    disabledCodePoints: Record<string, boolean>;
    collapsedGroups: Record<string, boolean>;
  };

  type TFontsState = {
    fonts: Record<string, TFont>;
    selectedFontId: string | null;
    parsedFonts: Record<string, TParsedFont>;
    parsingFonts: Record<string, boolean>;
  };
}
