import { Component, createMemo, For, Show } from "solid-js";

import { GlyphCell } from "./GlyphCell";
import styles from "./GlyphGroup.module.css";

import type { TFontInfo, TGlyphGroup } from "Types";

const formatPercent = (count: number, total: number): string => {
  if (total === 0) return "0%";
  const percent = (count / total) * 100;
  if (percent < 1) return "<1%";
  return `~${Math.round(percent)}%`;
};

const formatEstimatedSize = (
  glyphCount: number,
  totalGlyphs: number,
  fontFileSize: number
): string => {
  if (totalGlyphs === 0 || fontFileSize === 0) return "";
  // Estimate: glyphs are roughly 60-70% of font file size (rest is metadata, tables)
  const glyphDataRatio = 0.65;
  const estimatedBytes =
    (glyphCount / totalGlyphs) * fontFileSize * glyphDataRatio;
  const kb = estimatedBytes / 1024;
  if (kb < 1) return "1 KB";
  return `${Math.round(kb)} KB`;
};

type GlyphGroupProps = {
  group: TGlyphGroup;
  fontInfo: TFontInfo;
  totalGlyphs: number;
  fontFileSize: number;
};

export const GlyphGroup: Component<GlyphGroupProps> = (props) => {
  const weightPercent = createMemo(() =>
    formatPercent(props.group.glyphs.length, props.totalGlyphs)
  );

  const estimatedSize = createMemo(() =>
    formatEstimatedSize(
      props.group.glyphs.length,
      props.totalGlyphs,
      props.fontFileSize
    )
  );

  return (
    <Show when={props.group.glyphs.length > 0}>
      <section class={styles.group}>
        <header>
          <div>
            <h3>{props.group.category.name}</h3>
          </div>
          <div class={styles.groupMeta}>
            {props.group.glyphs.length} glyphs
            <div class={styles.groupWeight}>
              {weightPercent()} ({estimatedSize()})
            </div>
          </div>
        </header>
        <div class={styles.grid}>
          <For each={props.group.glyphs}>
            {(glyph) => <GlyphCell glyph={glyph} fontInfo={props.fontInfo} />}
          </For>
        </div>
      </section>
    </Show>
  );
};
