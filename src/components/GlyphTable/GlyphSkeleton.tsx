import { Component, For } from "solid-js";

import { cn } from "~/glyph/cn";

import cellStyles from "./GlyphCell.module.css";
import groupStyles from "./GlyphGroup.module.css";
import styles from "./GlyphSkeleton.module.css";

type GlyphSkeletonProps = {
  count: number;
};

export const GlyphSkeleton: Component<GlyphSkeletonProps> = (props) => {
  return (
    <section class={groupStyles.group}>
      <header>
        <div class={cn(styles.name, "pulse")} />
      </header>
      <div class={groupStyles.grid}>
        <For each={Array.from({ length: props.count }, (_, i) => i)}>
          {() => (
            <div class={cn(cellStyles.cell, "pulse")}>
              <div class={styles.glyph} />
              <div class={styles.info} />
            </div>
          )}
        </For>
      </div>
    </section>
  );
};
