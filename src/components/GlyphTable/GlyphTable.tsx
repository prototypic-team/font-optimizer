import { Component, createMemo, For, Show } from "solid-js";

import { estimateSize, useCurrentFont } from "~/modules/fonts/utils";
import { formatFileSize } from "~/utils/format";

import { GlyphGroup } from "./GlyphGroup";
import styles from "./GlyphTable.module.css";

export const GlyphTable: Component = () => {
  const { base, parsed } = useCurrentFont();

  const disabledGlyphsCount = createMemo(() => {
    if (!base() || !parsed()) return 0;

    return Object.values(base()!.glyphsMask).filter((v) => v === false).length;
  });
  const glyphCount = createMemo(() =>
    parsed() ? parsed()!.totalGlyphs - disabledGlyphsCount() : 0
  );
  const estimatedSize = createMemo(() => {
    if (!parsed() || !base()) return 0;

    return estimateSize(
      disabledGlyphsCount(),
      parsed()!.totalGlyphs,
      base()!.size
    ).bytes;
  });

  return (
    <Show when={base()}>
      <div class={styles.table}>
        <header class={styles.header}>
          <h1 style={{ "font-family": `"${base()!.id}", sans-serif` }}>
            {base()!.name}
          </h1>
          {parsed() && (
            <div class={styles.fontInfo}>
              {disabledGlyphsCount()
                ? `${glyphCount()} / ${parsed()!.totalGlyphs}`
                : glyphCount()}{" "}
              glyphs
              <span class={styles.fontFileSize}>
                {disabledGlyphsCount()
                  ? `${formatFileSize(base()!.size)} → ${formatFileSize(base()!.size - estimatedSize())}`
                  : formatFileSize(base()!.size)}
              </span>
            </div>
          )}
        </header>
        <Show when={parsed()}>
          <div class={styles.groups}>
            <For each={parsed()!.groups}>
              {(group) =>
                group.glyphs.length > 0 ? <GlyphGroup group={group} /> : null
              }
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
};
