import { Component, createMemo, For, Show } from "solid-js";

import { cn } from "~/glyph";
import { addFonts, clearFonts, selectFont, store } from "~/modules/state";
import { boolean } from "~/utils/boolean";
import { formatFileSize } from "~/utils/format";
import { isMac } from "~/utils/platform";
import { useFilePicker } from "~/utils/useFilePicker";

import styles from "./FontList.module.css";

const modKey = isMac ? "⌘" : "Ctrl";

export const FontList: Component = () => {
  const fonts = createMemo(() =>
    store.fontOrder.map((id) => store.fonts[id]).filter(boolean)
  );

  const { openFilePicker } = useFilePicker({ onFilesSelected: addFonts });

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
        <button
          class={cn(styles.item, styles.addFonts)}
          onClick={openFilePicker}
        >
          <div>
            <span class={styles.name}>Upload Fonts</span>
            <span class={styles.size}>
              {modKey} + U
            </span>
          </div>
        </button>
        <button
          id="clear-all"
          class={cn(styles.item, styles.clearAll)}
          onClick={clearFonts}
        >
          <div>
            <span class={styles.name}>Clear all</span>
            <span class={styles.size}>
              {modKey} + Del
            </span>
          </div>
        </button>
      </nav>
    </Show>
  );
};
