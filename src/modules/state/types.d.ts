declare module "Types" {
  export type TFont = {
    id: string;
    name: string;
    fileName: string;
    size: number;
    extension: string;
    file: File;
    /** Code point -> enabled (true) / disabled (false). Omitted code points default to enabled. */
    disabledCodePoints: Record<string, boolean>;
  };
}
