import { Component, createMemo } from "solid-js";

import { DropZone } from "~/components/FontDropZone/DropZone";
import { FontList } from "~/components/FontList/FontList";
import { GlyphTable } from "~/components/GlyphTable/GlyphTable";

import styles from "./App.module.css";
import { store } from "./modules/state";

export const App: Component = () => {
  const isEmpty = createMemo(() => Object.keys(store.fonts).length === 0);
  return (
    <>
      <DropZone>
        <div class={styles.main}>
          <FontList />
          <GlyphTable />
        </div>
      </DropZone>
      {isEmpty() && (
        <footer>
          <div>© 2026 Prototypic</div>
          <a href="/terms" style="margin-left: auto">
            Terms of Service
          </a>
          <a href="/privacy">Privacy Policy</a>
        </footer>
      )}
    </>
  );
};
