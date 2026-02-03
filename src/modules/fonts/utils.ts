import { TFont } from "Types";

export const fontsPredicate = (a: TFont, b: TFont) => {
  return a.name.localeCompare(b.name) || a.extension.localeCompare(b.extension);
};
