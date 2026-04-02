import { createMemo } from "solid-js";

import { store } from "~/modules/state";

export const useCurrentFont = () => ({
  base: createMemo(() =>
    store.selectedFontId ? store.fonts[store.selectedFontId] : undefined
  ),
  parsed: createMemo(() =>
    store.selectedFontId ? store.parsedFonts[store.selectedFontId] : undefined
  ),
  isParsing: createMemo(
    () => !!store.selectedFontId && !!store.parsingFonts[store.selectedFontId]
  ),
});
