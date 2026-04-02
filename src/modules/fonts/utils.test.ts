import { describe, expect, it } from "bun:test";

import { fontsPredicate, formatCodePoint } from "./utils";

import { TFont } from "Types";

const mockFont = (overrides: Partial<TFont> = {}): TFont => ({
  id: "1",
  name: "Roboto",
  fileName: "Roboto.woff2",
  extension: "woff2",
  file: new File([], "Roboto.woff2"),
  disabledCodePoints: {},
  collapsedGroups: {},
  weight: { original: 100000 },
  ...overrides,
});
describe("fontsPredicate", () => {
  it("sorts fonts alphabetically by name", () => {
    const fonts = [mockFont({ name: "Roboto" }), mockFont({ name: "Arial" })];
    expect(fonts.sort(fontsPredicate).map((f) => f.name)).toEqual([
      "Arial",
      "Roboto",
    ]);
  });

  it("sorts by extension when names are equal", () => {
    const fonts = [
      mockFont({ name: "Roboto", extension: "woff2" }),
      mockFont({ name: "Roboto", extension: "ttf" }),
    ];
    expect(fonts.sort(fontsPredicate).map((f) => f.extension)).toEqual([
      "ttf",
      "woff2",
    ]);
  });
});

describe("formatCodePoint", () => {
  it("formats a code point with U+ prefix and uppercase hex", () => {
    expect(formatCodePoint(65)).toBe("U+0041");
  });

  it("pads short code points to 4 digits", () => {
    expect(formatCodePoint(10)).toBe("U+000A");
  });

  it("handles larger code points", () => {
    expect(formatCodePoint(0x1f600)).toBe("U+1F600");
  });
});
