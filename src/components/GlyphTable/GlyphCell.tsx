import { Component, createMemo, Show } from "solid-js";

import { formatCodePoint } from "~/modules/fonts/parser";

import styles from "./GlyphCell.module.css";

import type { TFontInfo, TGlyph } from "Types";

type GlyphCellProps = {
  glyph: TGlyph;
  fontInfo: TFontInfo;
};

export const GlyphCell: Component<GlyphCellProps> = (props) => {
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
