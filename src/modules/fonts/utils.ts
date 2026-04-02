import { TFont } from "Types";

export const fontsPredicate = (a: TFont, b: TFont) => {
  return a.name.localeCompare(b.name) || a.extension.localeCompare(b.extension);
};

export const formatCodePoint = (codePoint: number): string =>
  `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
