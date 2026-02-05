import { Component, createMemo, Show } from "solid-js";

import { formatCodePoint } from "~/modules/fonts/parser";
import { useCurrentFont } from "~/modules/fonts/utils";
import { toggleGlyph } from "~/modules/state";

import styles from "./GlyphCell.module.css";

import type { TGlyph } from "Types";

type GlyphCellProps = {
  glyph: TGlyph;
};

export const GlyphCell: Component<GlyphCellProps> = (props) => {
  const { base, parsed } = useCurrentFont();
  // SVG viewBox: minX, minY, width, height
  // Font coordinates: Y goes up. SVG coordinates: Y goes down.
  // We flip Y with scale(1, -1), so font's maxY becomes SVG's minY (top edge)
  // Use 0 for minX and unitsPerEm for width, then translate to center each glyph
  const viewBox = createMemo(() => {
    if (!parsed()?.info) return "0 0 0 0";
    const { bbox } = parsed()!.info;
    return `0 ${-bbox.maxY} ${bbox.width} ${bbox.height}`;
  });

  // Calculate horizontal offset to center the glyph based on its advance width
  const transform = createMemo(() => {
    if (!parsed()?.info) return "";

    const { bbox } = parsed()!.info;
    const offsetX = (bbox.width - props.glyph.advanceWidth) / 2;
    return `translate(${offsetX}, 0) scale(1, -1)`;
  });

  const hasPath = createMemo(
    () => props.glyph.path && props.glyph.path.length > 0
  );

  return (
    <button
      type="button"
      class={styles.cell}
      classList={{
        [styles.cell]: true,
        [styles.disabled]: base()?.glyphsMask[props.glyph.id] === false,
      }}
      title={props.glyph.name}
      onClick={() => toggleGlyph(base()!.id, props.glyph.id)}
    >
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
    </button>
  );
};
