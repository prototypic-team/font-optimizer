import { Component } from "solid-js";

import { cn } from "~/glyph/cn";

import groupStyles from "./GlyphGroup.module.css";
import styles from "./GlyphSkeleton.module.css";

export const GlyphSkeleton: Component = () => {
  const width = `${Math.round(Math.random() * 100) + 150}px`;
  return (
    <section class={groupStyles.group}>
      <header>
        <div class={cn(styles.name, "pulse")} style={{ width }} />
      </header>
    </section>
  );
};
