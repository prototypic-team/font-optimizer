import { Component, createMemo, For, Show } from "solid-js";

import { cn } from "~/glyph/cn";
import { fontsPredicate } from "~/modules/fonts/utils";
import { selectFont, store } from "~/modules/state";
import { formatFileSize } from "~/utils/format";

import styles from "./FontList.module.css";

export const FontList: Component = () => {
  const fonts = createMemo(() =>
    Object.values(store.fonts).sort(fontsPredicate)
  );

  return (
    <Show when={fonts().length > 1}>
      <nav class={styles.list}>
        <For each={fonts()}>
          {(font) => (
            <button
              class={cn(
                styles.item,
                store.selectedFontId === font.id && styles.selected
              )}
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
      </nav>
    </Show>
  );
};
