import { Component, createMemo, For, Show } from "solid-js";

import { formatCodePoint } from "~/modules/fonts/parser";
import { store } from "~/modules/state";
import { formatFileSize } from "~/utils/format";

import styles from "./GlyphTable.module.css";

import type { TFontInfo, TGlyph, TGlyphGroup } from "Types";

type GlyphCellProps = {
  glyph: TGlyph;
  fontInfo: TFontInfo;
};

const GlyphCell: Component<GlyphCellProps> = (props) => {
  // SVG viewBox: minX, minY, width, height
  // Font coordinates: Y goes up. SVG coordinates: Y goes down.
  // We flip Y with scale(1, -1), so font's maxY becomes SVG's minY (top edge)
  // Use 0 for minX and unitsPerEm for width, then translate to center each glyph
  const viewBox = createMemo(() => {
    const { bbox } = props.fontInfo;
    return `0 ${-bbox.maxY} ${bbox.width} ${bbox.height}`;
  });

  // Calculate horizontal offset to center the glyph based on its advance width
  const transform = createMemo(() => {
    const { bbox } = props.fontInfo;
    const offsetX = (bbox.width - props.glyph.advanceWidth) / 2;
    return `translate(${offsetX}, 0) scale(1, -1)`;
  });

  const hasPath = createMemo(
    () => props.glyph.path && props.glyph.path.length > 0
  );

  return (
    <div class={styles.cell} title={props.glyph.name}>
      <svg class={styles.glyphSvg} viewBox={viewBox()}>
        <Show
          when={hasPath()}
          fallback={
            <text
              x="50%"
              y="50%"
              text-anchor="middle"
              dominant-baseline="middle"
              class={styles.glyphPlaceholder}
            >
              ?
            </text>
          }
        >
          <path
            d={props.glyph.path}
            fill="currentColor"
            transform={transform()}
          />
        </Show>
      </svg>
      <div class={styles.info}>
        <span class={styles.name}>{props.glyph.name}</span>
        {props.glyph.codePoints && (
          <span class={styles.code}>
            {props.glyph.codePoints.map(formatCodePoint).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
};

type GlyphGroupProps = {
  group: TGlyphGroup;
  fontInfo: TFontInfo;
  totalGlyphs: number;
  fontFileSize: number;
};

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

const GlyphGroup: Component<GlyphGroupProps> = (props) => {
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

export const GlyphTableLoader: Component = () => {
  return (
    <div class={styles.loader}>
      <div class={styles.spinner} />
      <span>Parsing font...</span>
    </div>
  );
};
