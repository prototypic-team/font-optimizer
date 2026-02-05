import { Component, createEffect, createMemo, For } from "solid-js";

import { useCurrentFont } from "~/modules/fonts/utils";
import { toggleGroup } from "~/modules/state";

import { GlyphCell } from "./GlyphCell";
import styles from "./GlyphGroup.module.css";

import type { TGlyphGroup } from "Types";

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
};

export const GlyphGroup: Component<GlyphGroupProps> = (props) => {
  const { base, parsed } = useCurrentFont();

  const glyphCount = createMemo(() => {
    let disabledGlyphsCount = 0;
    for (const glyph of props.group.glyphs) {
      if (base()?.glyphsMask[glyph.id] === false) {
        disabledGlyphsCount++;
      }
    }
    return props.group.glyphs.length - disabledGlyphsCount;
  });

  const weightPercent = createMemo(() =>
    formatPercent(glyphCount(), parsed()?.totalGlyphs || 0)
  );
  const estimatedSize = createMemo(() =>
    formatEstimatedSize(
      glyphCount(),
      parsed()?.totalGlyphs || 0,
      base()?.size || 0
    )
  );

  let checkboxRef: HTMLInputElement | undefined;
  const checkboxId = createMemo(
    () => `${base()?.id}-${props.group.category.id}`
  );

  createEffect(() => {
    if (checkboxRef) {
      const allEnabled = props.group.glyphs.every(
        (glyph) => base()?.glyphsMask[glyph.id] !== false
      );
      const allDisabled = props.group.glyphs.every(
        (glyph) => base()?.glyphsMask[glyph.id] === false
      );

      if (allEnabled) {
        checkboxRef.checked = true;
        checkboxRef.indeterminate = false;
      } else if (allDisabled) {
        checkboxRef.checked = false;
        checkboxRef.indeterminate = false;
      } else {
        checkboxRef.checked = false;
        checkboxRef.indeterminate = true;
      }
    }
  });

  return (
    <section class={styles.group}>
      <header>
        <div class={"f fa-c g1"}>
          <input
            type="checkbox"
            ref={checkboxRef}
            id={checkboxId()}
            onChange={() => toggleGroup(base()!.id, props.group.category.id)}
          />
          <label for={checkboxId()}>
            <h3>{props.group.category.name}</h3>
          </label>
        </div>
        {glyphCount() > 0 && (
          <div class={styles.meta}>
            {glyphCount() !== props.group.glyphs.length
              ? `${glyphCount()} / ${props.group.glyphs.length}`
              : glyphCount()}{" "}
            glyphs
            <div class={styles.weight}>
              {weightPercent()} ({estimatedSize()})
            </div>
          </div>
        )}
      </header>
      <div class={styles.grid}>
        <For each={props.group.glyphs}>
          {(glyph) => <GlyphCell glyph={glyph} />}
        </For>
      </div>
    </section>
  );
};
