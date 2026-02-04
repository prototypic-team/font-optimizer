import { Component, createMemo, For, Show } from "solid-js";

import { store } from "~/modules/state";
import { formatFileSize } from "~/utils/format";

import { GlyphGroup } from "./GlyphGroup";
import styles from "./GlyphTable.module.css";

export const GlyphTable: Component = () => {
  const font = createMemo(() =>
    store.selectedFontId ? store.fonts[store.selectedFontId] : undefined
  );
  const parsedFont = createMemo(() =>
    store.selectedFontId ? store.parsedFonts[store.selectedFontId] : undefined
  );
  return (
    <Show when={font()}>
      <div class={styles.table}>
        <header class={styles.header}>
          <h1 style={{ "font-family": `"${font()!.id}", sans-serif` }}>
            {font()!.name}
          </h1>
          {parsedFont() && (
            <div class={styles.fontInfo}>
              {parsedFont()!.totalGlyphs} glyphs
              <span class={styles.fontFileSize}>
                {formatFileSize(font()!.size)}
              </span>
            </div>
          )}
        </header>
        <Show when={parsedFont()}>
          <div class={styles.groups}>
            <For each={parsedFont()!.groups}>
              {(group) => (
                <GlyphGroup
                  group={group}
                  fontInfo={parsedFont()!.info}
                  totalGlyphs={parsedFont()!.totalGlyphs}
                  fontFileSize={font()!.size}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
};
