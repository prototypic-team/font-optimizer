import { Component, createMemo, For, Show } from "solid-js";

import { cn } from "~/glyph/cn";
import { fontsPredicate } from "~/modules/fonts/utils";
import { selectFont, store } from "~/modules/state";
import { formatFileSize } from "~/utils/format";

import styles from "./FontList.module.css";

import type { TFont } from "Types";

type FontNameProps = {
  font: TFont;
  class?: string;
};

const FontName: Component<FontNameProps> = (props) => {
  return (
    <span
      class={props.class}
      style={{ "font-family": `"${props.font.id}", sans-serif` }}
    >
      {props.font.name}
    </span>
  );
};

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
              <FontName font={font} class={styles.name} />
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
