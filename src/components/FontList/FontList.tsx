import { Component, createMemo, For, Show } from "solid-js";

import { Button } from "~/glyph/Button/Button";
import { clearFonts, selectFont, store } from "~/modules/state";
import { boolean } from "~/utils/boolean";
import { formatFileSize } from "~/utils/format";

import styles from "./FontList.module.css";

export const FontList: Component = () => {
  const fonts = createMemo(() =>
    store.fontOrder.map((id) => store.fonts[id]).filter(boolean)
  );

  return (
    <Show when={fonts().length > 1}>
      <nav class={styles.list}>
        <For each={fonts()}>
          {(font) => (
            <button
              class={styles.item}
              classList={{
                [styles.selected]: store.selectedFontId === font.id,
                [styles.parsed]: !!store.parsedFonts[font.id],
                pulse: store.parsingFonts[font.id],
              }}
              onClick={() => selectFont(font.id)}
            >
              <span
                class={styles.name}
                style={{ "font-family": `"${font.id}", sans-serif` }}
              >
                {font.name}
              </span>
              <span class={styles.size}>
                {[font.extension, formatFileSize(font.size)]
                  .filter(Boolean)
                  .join("・")}
              </span>
            </button>
          )}
        </For>
        <Button id="clear-all" class={styles.clearAll} onClick={clearFonts}>
          Clear all
        </Button>
      </nav>
    </Show>
  );
};
