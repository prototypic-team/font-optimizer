import { Component } from "solid-js";

import { DropZone } from "~/components/FontDropZone/DropZone";
import { FontList } from "~/components/FontList/FontList";
import { GlyphTable } from "~/components/GlyphTable/GlyphTable";

import styles from "./App.module.css";

export const App: Component = () => {
  return (
    <DropZone>
      <div class={styles.main}>
        <FontList />
        <GlyphTable />
      </div>
    </DropZone>
  );
};
