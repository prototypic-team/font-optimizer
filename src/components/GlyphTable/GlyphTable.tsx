import { Component, createMemo, For, Show } from "solid-js";

import { estimateSize, useCurrentFont } from "~/modules/fonts/utils";
import { formatFileSize } from "~/utils/format";

import { GlyphGroup } from "./GlyphGroup";
import { GlyphSkeleton } from "./GlyphSkeleton";
import styles from "./GlyphTable.module.css";

export const GlyphTable: Component = () => {
  const { base, parsed, isParsing } = useCurrentFont();

  const disabledGlyphsCount = createMemo(() => {
    if (!base() || !parsed()) return 0;

    return Object.values(base()!.disabledCodePoints).filter((v) => v === true)
      .length;
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
          <h1
            classList={{
              [styles.parsed]: !!parsed(),
              pulse: isParsing(),
            }}
            style={{ "font-family": `"${base()!.id}", sans-serif` }}
          >
            {base()!.name}
          </h1>
          {parsed() && (
            <div class={styles.fontInfo}>
              {disabledGlyphsCount()
                ? `${glyphCount()} / ${parsed()!.totalGlyphs}`
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
        <div class={styles.groups}>
          <Show
            when={parsed()}
            fallback={
              <>
                <GlyphSkeleton count={14} />
                <GlyphSkeleton count={11} />
              </>
            }
          >
            <For each={parsed()!.groups}>
              {(group) =>
                group.glyphs.length > 0 ? <GlyphGroup group={group} /> : null
              }
            </For>
          </Show>
        </div>
      </div>
    </Show>
  );
};
