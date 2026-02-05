declare module "Types" {
  export type TFont = {
    id: string;
    name: string;
    fileName: string;
    size: number;
    extension: string;
    file: File;
    /** Glyph id -> enabled (true) / disabled (false). Omitted glyphs default to enabled. */
    glyphsMask: Record<number, boolean>;
  };
}
