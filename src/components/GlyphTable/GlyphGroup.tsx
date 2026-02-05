import { Component, createEffect, createMemo, For } from "solid-js";

import { estimateSize, useCurrentFont } from "~/modules/fonts/utils";
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

const formatEstimatedSize = (kb: number): string => {
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
      if (base()?.disabledCodePoints[glyph.codePoints.join(",")]) {
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
      estimateSize(glyphCount(), parsed()?.totalGlyphs || 0, base()?.size || 0)
        .kb
    )
  );

  let checkboxRef: HTMLInputElement | undefined;
  const checkboxId = createMemo(
    () => `${base()?.id}-${props.group.category.id}`
  );

  createEffect(() => {
    if (checkboxRef) {
      let allEnabled = true,
        allDisabled = true;
      for (const glyph of props.group.glyphs) {
        if (base()?.disabledCodePoints[glyph.codePoints.join(",")]) {
          allEnabled = false;
        } else {
          allDisabled = false;
        }
      }

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
